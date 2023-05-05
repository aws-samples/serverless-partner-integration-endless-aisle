import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { APIGatewayConstruct } from './common/apigateway/apiGateway';
import { DDBTableConstructs } from './constructs/ddb-tables';
import { ItemApiConstruct } from './constructs/item-api';
import { OrderApiConstruct } from './constructs/order-api';

// Properties for the ordering-stack

export class InfrastructureStack extends Stack {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  readonly apigw: RestApi;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id);

    /** Create Partner API Mock versions
     * 
     */
    const partnerInventoryApi = new APIGatewayConstruct(this, 'partnerInventoryApi', {
      apiname: 'mockInventory'
    });

    /** Create Datastore required for this service
     *  Order table and partner Table
     */
    const dynamoDBTables = new DDBTableConstructs(this, 'DatabaseStack', {
      partnerMockAPIUrl: partnerInventoryApi.api.url
    });

    // Setup the API with Cognito user pool
    const congitoToApiGwToLambda = new CognitoToApiGatewayToLambda(this, 'endless-aisle-api', {
      // existingLambdaObj: createOrder.lambdaFunction,
      lambdaFunctionProps: {
        runtime: Runtime.NODEJS_18_X,
        code: Code.fromAsset(`${__dirname}/lambda/`),
        handler: 'cognito.handler',
        timeout: Duration.seconds(15),
      },
      apiGatewayProps: {
        proxy: false,
        description: 'Endless Aisle handler API'
      },
      cognitoUserPoolProps: {
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireDigits: true,
          requireUppercase: true,
          requireSymbols: false,
        }
      }
    });

    /**
     * Order API
     * */

    new OrderApiConstruct(this, 'order-api', {
      ordertable: dynamoDBTables.ordertable,
      partnertable: dynamoDBTables.partnertable,
      partnerInventoryApi: partnerInventoryApi.api,
      env: {
        account: props.env?.account,
        region: props.env?.region
      },
      lambdaEnviroment: {
        ORDER_TABLE_PK: 'orderId',
        PARTNER_TABLE_PK: 'partnerId',
        ORDER_TABLE_ARN: dynamoDBTables.ordertable.tableArn,
        PARTNER_TABLE_ARN: dynamoDBTables.partnertable.tableArn,
        ORDER_TABLE_NAME: dynamoDBTables.ordertable.tableName,
        PARTNER_TABLE_NAME: dynamoDBTables.partnertable.tableName,
      },
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway
    });

    /**
     * Order API
     * */

    new ItemApiConstruct(this, 'item-api', {
      ordertable: dynamoDBTables.ordertable,
      partnertable: dynamoDBTables.partnertable,
      partnerInventoryApi: partnerInventoryApi.api,
      env: {
        account: props.env?.account,
        region: props.env?.region,
      },
      VERIFIED_EMAIL: process.env.SENDER_EMAIL || "",
      lambdaEnviroment: {
        ORDER_TABLE_PK: 'orderId',
        PARTNER_TABLE_PK: 'partnerId',
        ORDER_TABLE_ARN: dynamoDBTables.ordertable.tableArn,
        PARTNER_TABLE_ARN: dynamoDBTables.partnertable.tableArn,
        ORDER_TABLE_NAME: dynamoDBTables.ordertable.tableName,
        PARTNER_TABLE_NAME: dynamoDBTables.partnertable.tableName,
      },
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway
    });

    // Add the authorizers to the API

    congitoToApiGwToLambda.addAuthorizers();

    // This construct can only be attached to a configured API Gateway.
    new WafwebaclToApiGateway(this, 'wafwebacl-apigateway', {
      existingApiGatewayInterface: congitoToApiGwToLambda.apiGateway
    });

    this.userPool = congitoToApiGwToLambda.userPool;
    this.client = congitoToApiGwToLambda.userPoolClient;
    this.apigw = congitoToApiGwToLambda.apiGateway;
  }
}
