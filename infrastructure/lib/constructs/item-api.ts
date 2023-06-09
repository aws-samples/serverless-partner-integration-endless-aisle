// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { DynamoDBStreamsToLambda } from '@aws-solutions-constructs/aws-dynamodbstreams-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { Duration, Stack } from 'aws-cdk-lib';
import { AuthorizationType, LambdaIntegration, Model, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
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
    PARTNER_TABLE_NAME: string;
    TOKEN_PATH: string;
  },
  readonly STORE_EMAIL?: string;

  readonly congitoToApiGwToLambdaRestApi: RestApi,
  cloudWatchPolicyStatement: PolicyStatement

}

export class ItemApiConstruct extends Construct {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  readonly apigw: RestApi;
  readonly getItemLambda: IFunction;

  constructor(scope: Construct, id: string, props: ItemApiProps) {
    super(scope, id);


    const SES_REGION = props.env?.region || 'us-east-1';
    const STORE_EMAIL = props.STORE_EMAIL;
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
        functionName: `endless-aisle-getItem-lambda`,
        description: `Lambda Function to get item availability.`,
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/../lambda/`),
        handler: 'getItem.handler',
        timeout: Duration.seconds(15),
        environment: props.lambdaEnviroment
      },
      existingTableObj: props.partnertable
    });

    getItem.lambdaFunction.addToRolePolicy(props.cloudWatchPolicyStatement);

    const getItemIntegration = new LambdaIntegration(getItem.lambdaFunction);

    const getItemRequestModel = new Model(this, "get-item-model", {
      restApi: props.congitoToApiGwToLambdaRestApi,
      contentType: "application/json",
      description: "To validate the request body",
      modelName: "getItemmodel",
      schema: GetItemSchema
    });

    const items = props.congitoToApiGwToLambdaRestApi.root.addResource('items');

    const item = items.addResource('{id}');
    item.addMethod("GET", getItemIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizationScopes: ['email', 'openid', 'aws.cognito.signin.user.admin'],
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

    this.getItemLambda = getItem.lambdaFunction

    const orderStatus = new LambdaToDynamoDB(this, 'notifier-order-status', {
      lambdaFunctionProps: {
        functionName: `endless-aisle-notifier-lambda`,
        description: `Lambda Function to notify store associate about order placements.`,
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/../lambda/`),
        handler: 'notifier.handler',
        timeout: Duration.seconds(15),
        environment: {
          ...props.lambdaEnviroment,
          STORE_EMAIL: STORE_EMAIL || ""
        }
      },
      existingTableObj: props.partnertable
    });

    orderStatus.lambdaFunction.addToRolePolicy(props.cloudWatchPolicyStatement);
    const orderStatusdlq = new Queue(this, "notifier-order-status-DLQ", {
      queueName: `notify-order-dlqueue`,
      enforceSSL: true
    })

    new DynamoDBStreamsToLambda(this, 'notifier-order-dynamodbstreams-lambda', {
      existingLambdaObj: orderStatus.lambdaFunction,
      existingTableInterface: props.ordertable,
      deploySqsDlqQueue: true,
      sqsDlqQueueProps: {
        queueName: `notify-order-queue`,
        deadLetterQueue: {
          maxReceiveCount: 1,
          queue: orderStatusdlq
        }
      }
    });
    if (STORE_EMAIL) {
      const region = props.env.region;

      new EmailIdentity(this, 'Identity', {
        identity: Identity.email(STORE_EMAIL)
      });
      new AwsCustomResource(this, 'VerifyEmailIdentity' + STORE_EMAIL, {
        onCreate: {
          service: 'SES',
          action: 'verifyEmailIdentity',
          parameters: {
            EmailAddress: STORE_EMAIL,
          },
          physicalResourceId: PhysicalResourceId.of('verify-' + STORE_EMAIL),
          region,
        },
        onDelete: {
          service: 'SES',
          action: 'deleteIdentity',
          parameters: {
            Identity: STORE_EMAIL,
          },
          region,
        },
        policy: generateSesPolicyForCustomResource('VerifyEmailIdentity', 'DeleteIdentity'),
      });
      const SES_EMAIL_DOMAIN = STORE_EMAIL.split('@')[1];

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

