// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { Duration } from 'aws-cdk-lib';
import { AccessLogFormat, AuthorizationType, IdentitySource, LambdaIntegration, LambdaRestApi, LogGroupLogDestination, MethodLoggingLevel, Model, RequestAuthorizer, RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient, UserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, HttpMethod, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { PostPartnerOrderSchema } from '../../schema/apischema';

export interface APIGWProps {
  readonly apiname: string;
  cloudWatchPolicyStatement: PolicyStatement;
  cloudWatchPolicy?: Policy;
  TOKEN_PATH: string;
  webacl: CfnWebACL;

}

export class APIGatewayConstruct extends Construct {

  // Public variables
  public readonly api: RestApi;
  public readonly userPool: UserPool;
  public readonly userPoolDomain: UserPoolDomain;
  public readonly userPoolClient: UserPoolClient;
  readonly inventoryLambda: IFunction;

  // Constructor
  constructor(scope: Construct, id: string, props: APIGWProps) {
    super(scope, id);

    const inventoryRole = new Role(this, `${props.apiname}LambdaRole`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });

    // add cloudwatch access policy to the Function's role
    inventoryRole.addToPrincipalPolicy(props.cloudWatchPolicyStatement);

    // A Lambda function to get inventory from partner
    const inventoryHandler = new Function(this, `${props.apiname}Lambda`, {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(`${__dirname}/../../lambda/`),
      handler: 'inventory.handler',
      role: inventoryRole
    });

    const partnerInventoryRole = new Role(this, `${props.apiname}-partner-cognito-LambdaRole`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });

    // add the policy to the Function's role
    partnerInventoryRole.addToPrincipalPolicy(props.cloudWatchPolicyStatement);

    const partnerCustomAuthHandler = new Function(this, `${props.apiname}-partner-cognito-Lambda`, {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(`${__dirname}/../../lambda/`),
      handler: 'partnerCognito.handler',
      role: partnerInventoryRole,
      environment: {
        TOKEN_PATH: props.TOKEN_PATH
      }
    });

    const prdLogGroup = new LogGroup(this, `${props.apiname}`);

    const inventoryAPI = new LambdaRestApi(this, `${props.apiname} - api`, {
      restApiName: props.apiname,
      handler: partnerCustomAuthHandler,
      description: `RestAPI to lookup inventory`,
      proxy: false,
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: new LogGroupLogDestination(prdLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields()
      }
    });

    const inventoryResource = inventoryAPI.root.addResource("inventory");

    new RequestValidator(this, `${id} - inventory - request - validator`, {
      restApi: inventoryAPI,
      // the properties below are optional
      requestValidatorName: 'inventoryRequestValidator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    const inventoryIntegration = new LambdaIntegration(inventoryHandler);

    const postInventoryOrderModel = new Model(this, `${props.apiname}post - order - inventory - model - validator`, {
      restApi: inventoryAPI,
      contentType: "application/json",
      description: "To validate the order request body",
      modelName: "inventoryOrderModel",
      schema: PostPartnerOrderSchema,
    });

    const deviceApiAuthorizer = new RequestAuthorizer(this, 'deviceApiAuthorizer', {
      handler: partnerCustomAuthHandler,
      resultsCacheTtl: Duration.seconds(0),
      identitySources: [IdentitySource.header('authorizationToken')]
    });

    inventoryResource.addMethod(HttpMethod.GET, inventoryIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: deviceApiAuthorizer,
      requestParameters: {
        "method.request.querystring.itemId": true,
        "method.request.querystring.partner": true,
        "method.request.querystring.quantity": true,
      },
      requestValidatorOptions: {
        requestValidatorName: `${props.apiname}get - inv - req - querystring - validator`,
        validateRequestParameters: true,
        validateRequestBody: false,
      }
    });

    inventoryResource.addMethod(HttpMethod.POST, inventoryIntegration, {
      requestValidator: new RequestValidator(
        this,
        "post-order-inventory-body-validator",
        {
          restApi: inventoryAPI,
          requestValidatorName: `${props.apiname}post - order - req - inventory - validator`,
          validateRequestBody: true,
        }
      ),
      requestModels: {
        "application/json": postInventoryOrderModel,
      },
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: deviceApiAuthorizer,
      methodResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }]
    });

    new WafwebaclToApiGateway(this, `${props.apiname}-wafwebacl-apigateway`, {
      existingApiGatewayInterface: inventoryAPI,
      existingWebaclObj: props.webacl
    });

    this.api = inventoryAPI;
    this.inventoryLambda = partnerCustomAuthHandler
  }
}