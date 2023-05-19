// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { Duration } from 'aws-cdk-lib';
import { AuthorizationType, AwsIntegration, IntegrationOptions, LambdaIntegration, MethodOptions, Model, RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, EventSourceMapping, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { CreateOrderSchema, GetOrderSchema, UpdateOrderSchema } from '../schema/apischema';

// Properties for the ordering-stack
export interface OrderApiProps {
  readonly ordertable: Table,
  readonly partnertable: Table
  readonly partnerInventoryApi: RestApi
  env: {
    account?: string,
    region?: string
  },
  readonly lambdaEnviroment: {
    ORDER_TABLE_PK: string;
    PARTNER_TABLE_PK: string;
    ORDER_TABLE_ARN: string;
    PARTNER_TABLE_ARN: string;
    ORDER_TABLE_NAME: string;
    PARTNER_TABLE_NAME: string;
    TOKEN_PATH: string;
  },
  readonly congitoToApiGwToLambdaRestApi: RestApi,
  readonly cloudWatchPolicy: Policy
}

export class OrderApiConstruct extends Construct {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  readonly apigw: RestApi;
  readonly createOrderLambda: IFunction;

  constructor(scope: Construct, id: string, props: OrderApiProps) {
    super(scope, id);

    /**
   * Order API
   *  Creating and Lambda functions to create, update, and Get order(s)
   *  Creating Cognito based and WAF enabled APIGateway
   *  Set up request validation methods.
   *  Added a queue for create order async calls.
   * */
    // A Lambda function that adds a new order to the database

    const createOrder = new LambdaToDynamoDB(this, 'create-order', {
      lambdaFunctionProps: {
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/../lambda/`),
        handler: 'createOrder.handler',
        timeout: Duration.seconds(15),
        environment: props.lambdaEnviroment,
      },
      existingTableObj: props.ordertable
    });
    props.partnertable.grantReadData(createOrder.lambdaFunction);


    createOrder.lambdaFunction.role?.attachInlinePolicy(props.cloudWatchPolicy);

    const apigwInvokePolicyStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["execute-api:Invoke"],
      resources: [`arn:aws:execute-api:${props.env?.region}:${props.env?.account}:${props.partnerInventoryApi.restApiId}`]
    });

    createOrder.lambdaFunction.addToRolePolicy(apigwInvokePolicyStatement);

    const orders = props.congitoToApiGwToLambdaRestApi.root.addResource('orders');

    const order = orders.addResource('{id}');

    const orderdlq = new Queue(this, "Order-DLQ", {
      enforceSSL: true
    })
    const orderqueue = new Queue(this, 'OrderQueue', {
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: orderdlq
      },
      enforceSSL: true
    });
    const createOrderIntegrationRole = new Role(this, 'integration-role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    const createReqIntegrationOptions: IntegrationOptions = {
      credentialsRole: createOrderIntegrationRole,
      requestParameters: {
        'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
      },
      requestTemplates: {
        'application/json': 'Action=SendMessage&QueueUrl=$util.urlEncode("' + orderqueue.queueUrl + '")&MessageBody=$util.urlEncode($input.body)'
      },
      integrationResponses: [{
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Methods": "'GET,POST,PATCH,OPTIONS'",
          "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,x-api-key,x-amz-security-token,Auth'",
          "method.response.header.Access-Control-Allow-Origin": "'*'"
        }
      }
      ]
    };

    //Create SQS intergration for DynamoDB    
    const createOrderIntegration = new AwsIntegration({
      service: "sqs",
      path: `${process.env.CDK_DEFAULT_ACCOUNT}/${orderqueue.queueName}`,
      integrationHttpMethod: "POST",
      options: createReqIntegrationOptions,
    });
    orderqueue.grantSendMessages(createOrderIntegrationRole);

    // Queue listner lambda function - create-order
    new EventSourceMapping(this, 'orderEventSourceMapping', {
      target: createOrder.lambdaFunction,
      batchSize: 1,
      eventSourceArn: orderqueue.queueArn
    });
    orderqueue.grantConsumeMessages(createOrder.lambdaFunction);


    const createOrderRequestModel = new Model(this, "create-order-req-model", {
      restApi: props.congitoToApiGwToLambdaRestApi,
      contentType: "application/json",
      description: "To validate the request body",
      modelName: "craeteOrderRequestModel",
      schema: CreateOrderSchema
    });

    const createOrderRequestOptions: MethodOptions = {
      requestValidator: new RequestValidator(
        this,
        "create-order-request-body-validator",
        {
          restApi: props.congitoToApiGwToLambdaRestApi,
          requestValidatorName: "create-order-request-validator",
          validateRequestBody: true,
        }
      ),
      requestModels: {
        "application/json": createOrderRequestModel,
      },
      authorizationType: AuthorizationType.COGNITO,
      authorizationScopes: ['email', 'openid', 'aws.cognito.signin.user.admin'],
      methodResponses: [{
        statusCode: '200', responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Origin": true
        }
      }, { statusCode: '400' }, { statusCode: '500' }]
    }

    orders.addMethod("POST", createOrderIntegration, createOrderRequestOptions);


    // A Lambda function that gets an order from the database
    const getOrder = new LambdaToDynamoDB(this, 'get-order', {
      lambdaFunctionProps: {
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/../lambda/`),
        handler: 'getOrder.handler',
        timeout: Duration.seconds(15),
        environment: props.lambdaEnviroment
      },
      existingTableObj: props.ordertable
    });
    props.partnertable.grantReadData(getOrder.lambdaFunction);

    getOrder.lambdaFunction.role?.attachInlinePolicy(props.cloudWatchPolicy);

    const getOrderIntegration = new LambdaIntegration(getOrder.lambdaFunction);

    const getOrderRequestModel = new Model(this, "get-order-request-model", {
      restApi: props.congitoToApiGwToLambdaRestApi,
      contentType: "application/json",
      description: "To validate the request body",
      modelName: "getOrdermodel",
      schema: GetOrderSchema
    });

    order.addMethod("GET", getOrderIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizationScopes: ['email', 'openid', 'aws.cognito.signin.user.admin'],
      requestParameters: {
        "method.request.path.id": true,
        "method.request.querystring.partner": true,
      },
      requestValidatorOptions: {
        requestValidatorName: "get-order-req-querystring-validator",
        validateRequestParameters: true,
        validateRequestBody: false,
      },
      requestModels: {
        "application/json": getOrderRequestModel,
      },
      methodResponses: [{
        statusCode: '200', responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Origin": true
        }
      }, { statusCode: '400' }, { statusCode: '500' }]
    });

    // A Lambda function that updates an order from the database
    const updateOrder = new LambdaToDynamoDB(this, 'update-order', {
      lambdaFunctionProps: {
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/../lambda/`),
        handler: 'updateOrder.handler',
        timeout: Duration.seconds(15),
        environment: props.lambdaEnviroment
      },
      existingTableObj: props.ordertable
    });

    updateOrder.lambdaFunction.role?.attachInlinePolicy(props.cloudWatchPolicy);

    props.partnertable.grantReadData(updateOrder.lambdaFunction);

    const updateOrderByIdIntegration = new LambdaIntegration(updateOrder.lambdaFunction);

    const updateOrderRequestModel = new Model(this, "update-order-request-model", {
      restApi: props.congitoToApiGwToLambdaRestApi,
      contentType: "application/json",
      description: "To validate the request body",
      modelName: "updateOrdermodel",
      schema: UpdateOrderSchema
    });

    const updateOrderRequestModelOption: MethodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizationScopes: ['email', 'openid', 'aws.cognito.signin.user.admin'],
      requestParameters: {
        "method.request.path.id": true,
      },
      requestModels: {
        "application/json": updateOrderRequestModel,
      },
      methodResponses: [{
        statusCode: '200', responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Origin": true
        }
      }, { statusCode: '400' }, { statusCode: '500' }]
    }

    this.createOrderLambda = createOrder.lambdaFunction;
    order.addMethod("PATCH", updateOrderByIdIntegration, updateOrderRequestModelOption);
  }
}
