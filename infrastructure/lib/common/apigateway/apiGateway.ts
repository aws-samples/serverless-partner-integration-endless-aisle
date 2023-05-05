// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AuthorizationType, CfnStage, LambdaIntegration, LambdaRestApi, MethodOptions, Model, RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { PostPartnerOrderSchema } from '../../schema/apischema';

export interface APIGWProps {
  readonly apiname: string,
}

// Stack
export class APIGatewayConstruct extends Construct {

  // Public variables
  public readonly api: RestApi;

  // Constructor
  constructor(scope: Construct, id: string, props: APIGWProps) {
    super(scope, id);

    // A Lambda function that gets an order from the database
    const inventoryHandler = new Function(this, `${props.apiname}Lambda`, {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(`${__dirname}/../../lambda/`),
      handler: 'inventory.handler',
    });

    const inventoryAPI = new LambdaRestApi(this, `${props.apiname}-api`, {
      restApiName: props.apiname,
      handler: inventoryHandler,
      description: `RestAPI to lookup inventory`,
      proxy: false,
    });

    const inventoryResource = inventoryAPI.root.addResource("inventory", {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*']
      }
    });

    const inventoryIntegration = new LambdaIntegration(inventoryHandler);

    const getOrderInventoryRequestOptions: MethodOptions = {
      authorizationType: AuthorizationType.IAM,
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
    }

    const postInventoryOrderModel = new Model(this, `${props.apiname}post-order-inventory-model-validator`, {
      restApi: inventoryAPI,
      contentType: "application/json",
      description: "To validate the order request body",
      modelName: "inventoryOrderModel",
      schema: PostPartnerOrderSchema,
    });

    const postInvetoryRequestOptions: MethodOptions = {
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
      authorizationType: AuthorizationType.IAM,
      methodResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }]
    }

    inventoryResource.addMethod(HttpMethod.GET, inventoryIntegration, getOrderInventoryRequestOptions);

    inventoryResource.addMethod(HttpMethod.POST, inventoryIntegration, postInvetoryRequestOptions);

    this.api = inventoryAPI;

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