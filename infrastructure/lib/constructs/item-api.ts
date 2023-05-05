// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { DynamoDBStreamsToLambda } from '@aws-solutions-constructs/aws-dynamodbstreams-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { Duration, Stack } from 'aws-cdk-lib';
import { AuthorizationType, LambdaIntegration, Model, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { GetItemSchema } from '../schema/apischema';

// Properties for the ordering-stack
export interface ItemApiProps {
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
    PARTNER_TABLE_NAME: string
  },
  readonly VERIFIED_EMAIL: string;

  readonly congitoToApiGwToLambdaRestApi: RestApi
}

export class ItemApiConstruct extends Construct {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  readonly apigw: RestApi;

  constructor(scope: Construct, id: string, props: ItemApiProps) {
    super(scope, id);


    const SES_REGION = props.env?.region || 'us-east-1';
    const SES_EMAIL_FROM = props.VERIFIED_EMAIL;
    // /**
    //  * Item method
    //  *  Creating and Lambda functions to get Items by ID or SKU
    //  *  Set up request validation methods.
    //  *  Add lambda function to connect to dynamo db
    //  * */

    // // A Lambda function that gets an item from the database

    // // A Lambda function that gets an item from the database
    const getItem = new LambdaToDynamoDB(this, 'get-item', {
      lambdaFunctionProps: {
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/../lambda/`),
        handler: 'getItem.handler',
        timeout: Duration.seconds(15),
        environment: props.lambdaEnviroment
      },
      existingTableObj: props.partnertable
    });

    const getItemIntegration = new LambdaIntegration(getItem.lambdaFunction);
    // getItem.lambdaFunction.addToRolePolicy(apigwInvokePolicyStatement);

    const getItemRequestModel = new Model(this, "get-item-model", {
      restApi: props.congitoToApiGwToLambdaRestApi,
      contentType: "application/json",
      description: "To validate the request body",
      modelName: "getItemmodel",
      schema: GetItemSchema
    });

    const items = props.congitoToApiGwToLambdaRestApi.root.addResource('items');
    const item = items.addResource('item');

    const itemId = item.addResource('{id}');
    itemId.addMethod("GET", getItemIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      requestParameters: {
        "method.request.path.id": true,
        "method.request.querystring.partnerId": true,
        "method.request.querystring.partner": true,
        "method.request.querystring.quantity": true
      },
      requestModels: {
        "application/json": getItemRequestModel,
      },
      methodResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }]
    });

    if (SES_EMAIL_FROM) {
      const region = props.env.region;

      new EmailIdentity(this, 'Identity', {
        identity: Identity.email(SES_EMAIL_FROM)
      });
      new AwsCustomResource(this, 'VerifyEmailIdentity' + SES_EMAIL_FROM, {
        onCreate: {
          service: 'SES',
          action: 'verifyEmailIdentity',
          parameters: {
            EmailAddress: SES_EMAIL_FROM,
          },
          physicalResourceId: PhysicalResourceId.of('verify-' + SES_EMAIL_FROM),
          region,
        },
        onDelete: {
          service: 'SES',
          action: 'deleteIdentity',
          parameters: {
            Identity: SES_EMAIL_FROM,
          },
          region,
        },
        policy: generateSesPolicyForCustomResource('VerifyEmailIdentity', 'DeleteIdentity'),
      });
    }

    const orderStatus = new LambdaToDynamoDB(this, 'order-status', {
      lambdaFunctionProps: {
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/../lambda/`),
        handler: 'notifier.handler',
        timeout: Duration.seconds(15),
        environment: {
          ...props.lambdaEnviroment,
          SES_EMAIL_FROM: SES_EMAIL_FROM
        }
      },
      existingTableObj: props.partnertable
    });

    const orderStatusdlq = new Queue(this, "Order-status-DLQ", {
      enforceSSL: true
    })

    new DynamoDBStreamsToLambda(this, 'order-dynamodbstreams-lambda', {
      existingLambdaObj: orderStatus.lambdaFunction,
      existingTableInterface: props.ordertable,
      deploySqsDlqQueue: true,
      sqsDlqQueueProps: {
        deadLetterQueue: {
          maxReceiveCount: 1,
          queue: orderStatusdlq
        }
      }
    });

    const SES_EMAIL_DOMAIN = SES_EMAIL_FROM.split('@')[1];

    // 👇 Add permissions to the Lambda function to send Emails
    orderStatus.lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:SendTemplatedEmail',
        ],
        resources: [
          `arn:aws:ses:${SES_REGION}:${Stack.of(this).account
          }:identity/*${SES_EMAIL_DOMAIN}`,
        ],
      }),
    );
  }
}

function generateSesPolicyForCustomResource(...methods: string[]): AwsCustomResourcePolicy {
  // for some reason the default policy is generated as `email:<method>` which does not work -> hence we need to provide our own
  return AwsCustomResourcePolicy.fromStatements([
    new PolicyStatement({
      actions: methods.map((method) => 'ses:' + method),
      effect: Effect.ALLOW,
      // PolicySim says ses:SetActiveReceiptRuleSet does not allow specifying a resource, hence use '*'
      resources: ['*'],
    }),
  ]);
}
