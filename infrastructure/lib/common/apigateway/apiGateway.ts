// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AuthorizationType, CfnStage, LambdaIntegration, Model, RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient, UserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { PostPartnerOrderSchema } from '../../schema/apischema';

export interface APIGWProps {
  readonly apiname: string,
  cloudWatchPolicyStatement: PolicyStatement
  cloudWatchPolicy?: Policy
}

export class APIGatewayConstruct extends Construct {

  // Public variables
  public readonly api: RestApi;
  public readonly userPool: UserPool;
  public readonly userPoolDomain: UserPoolDomain;
  public readonly userPoolClient: UserPoolClient;

  // Constructor
  constructor(scope: Construct, id: string, props: APIGWProps) {
    super(scope, id);

    const inventoryRole = new Role(this, `${props.apiname}LambdaRole`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });

    // add the policy to the Function's role
    inventoryRole.addToPrincipalPolicy(props.cloudWatchPolicyStatement);

    // A Lambda function that gets an order from the database
    const inventoryHandler = new Function(this, `${props.apiname}Lambda`, {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(`${__dirname}/../../lambda/`),
      handler: 'inventory.handler',
      role: inventoryRole
    });

    const cognitoInventoryAPI = new CognitoToApiGatewayToLambda(this, `${props.apiname}-api`, {
      existingLambdaObj: inventoryHandler,
      apiGatewayProps: {
        proxy: false,
        description: 'Mock handler API'
      },
      cognitoUserPoolProps: {
        passwordPolicy: {
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: true,
          tempPasswordValidity: Duration.days(1),
        },
        removalPolicy: RemovalPolicy.DESTROY
      },
      cognitoUserPoolClientProps: {
        generateSecret: true
      }
    });

    const userPoolDomain = new UserPoolDomain(this, `${props.apiname}-domain`, {
      userPool: cognitoInventoryAPI.userPool,
      cognitoDomain: {
        domainPrefix: `endlessaisle-partner`
      }
    });

    const inventoryAPI = cognitoInventoryAPI.apiGateway;

    const inventoryResource = inventoryAPI.root.addResource("inventory");

    new RequestValidator(this, `${id}-inventory-request-validator`, {
      restApi: inventoryAPI,
      // the properties below are optional
      requestValidatorName: 'inventoryRequestValidator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    const inventoryIntegration = new LambdaIntegration(inventoryHandler);

    const postInventoryOrderModel = new Model(this, `${props.apiname}post-order-inventory-model-validator`, {
      restApi: inventoryAPI,
      contentType: "application/json",
      description: "To validate the order request body",
      modelName: "inventoryOrderModel",
      schema: PostPartnerOrderSchema,
    });

    inventoryResource.addMethod(HttpMethod.GET, inventoryIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      requestParameters: {
        "method.request.querystring.itemId": true,
        "method.request.querystring.partner": true,
        "method.request.querystring.quantity": true,
      },
      requestValidatorOptions: {
        requestValidatorName: `${props.apiname}get-inv-req-querystring-validator`,
        validateRequestParameters: true,
        validateRequestBody: false,
      },
    });

    inventoryResource.addMethod(HttpMethod.POST, inventoryIntegration, {
      requestValidator: new RequestValidator(
        this,
        "post-order-inventory-body-validator",
        {
          restApi: inventoryAPI,
          requestValidatorName: `${props.apiname}post-order-req-inventory-validator`,
          validateRequestBody: true,
        }
      ),
      requestModels: {
        "application/json": postInventoryOrderModel,
      },
      authorizationType: AuthorizationType.COGNITO,
      methodResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }]
    });

    cognitoInventoryAPI.addAuthorizers();

    this.api = inventoryAPI;
    this.userPool = cognitoInventoryAPI.userPool;
    this.userPoolDomain = userPoolDomain;
    this.userPoolClient = cognitoInventoryAPI.userPoolClient;

    const stage = inventoryAPI.deploymentStage?.node.defaultChild as CfnStage;

    const logGroup = new LogGroup(inventoryAPI, 'AccessLogs', {
      retention: RetentionDays.ONE_MONTH, // Keep logs for 30 days
    });

    stage.accessLogSetting = {
      destinationArn: logGroup.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        userAgent: '$context.identity.userAgent',
        sourceIp: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        responseLength: '$context.responseLength',
      }),
    };
    logGroup.grantWrite(new ServicePrincipal('apigateway.amazonaws.com'));

  }
}