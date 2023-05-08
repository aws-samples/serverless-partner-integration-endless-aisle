import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient, UserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
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
  readonly endlessuserPoolDomain: UserPoolDomain;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id);

    const cloudWatchPolicyStatement = new PolicyStatement({
      actions: ["logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*:*`],
    });
    const cloudWatchPolicy = new Policy(this, `${id}-cloudwatch-policy`, {
      statements: [cloudWatchPolicyStatement],
    })

    /** 
     * Create Partner API Mock versions
     */
    const partnerInventoryApi = new APIGatewayConstruct(this, 'partnerInventoryApi', {
      apiname: 'mockInventory',
      cloudWatchPolicyStatement: cloudWatchPolicyStatement,
    });

    /** 
     * Create Datastore required for this service
     *  Order table and partner Table
     */
    const dynamoDBTables = new DDBTableConstructs(this, 'DatabaseStack', {
      partnerMockAPIUrl: partnerInventoryApi.api.url,
      cloudWatchPolicyStatement: cloudWatchPolicyStatement
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
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: true,
          tempPasswordValidity: Duration.days(1),
        },
        removalPolicy: RemovalPolicy.DESTROY,
      }
    });

    const endlessuserPoolDomain = new UserPoolDomain(this, `endless-aisle-user-pool-domain`, {
      userPool: congitoToApiGwToLambda.userPool,
      cognitoDomain: {
        domainPrefix: `endlessaisle`
      }
    });

    new RequestValidator(this, `${id}-cognito-request-validator`, {
      restApi: congitoToApiGwToLambda.apiGateway,
      // the properties below are optional
      requestValidatorName: 'cognito-request-validator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    congitoToApiGwToLambda.lambdaFunction.role?.attachInlinePolicy(cloudWatchPolicy);

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
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway,
      cloudWatchPolicy: cloudWatchPolicy
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
      VERIFIED_EMAIL: process.env.SENDER_EMAIL,
      lambdaEnviroment: {
        ORDER_TABLE_PK: 'orderId',
        PARTNER_TABLE_PK: 'partnerId',
        ORDER_TABLE_ARN: dynamoDBTables.ordertable.tableArn,
        PARTNER_TABLE_ARN: dynamoDBTables.partnertable.tableArn,
        ORDER_TABLE_NAME: dynamoDBTables.ordertable.tableName,
        PARTNER_TABLE_NAME: dynamoDBTables.partnertable.tableName,
      },
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway,
      cloudWatchPolicyStatement: cloudWatchPolicyStatement
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
    this.endlessuserPoolDomain = endlessuserPoolDomain;

    new CfnOutput(this, 'APIUserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'APIClientId', { value: this.client.userPoolClientId });
    new CfnOutput(this, 'APIEndpoint', { value: this.apigw.url });
    new CfnOutput(this, 'EndlessAisleCognitoDomain', { value: `https://${endlessuserPoolDomain.cloudFrontDomainName}.auth.${this.region}.amazoncognito.com` });


    NagSuppressions.addResourceSuppressions(scope, [
      { id: 'AwsSolutions-L1', reason: 'AWS Cloudformation custom resource creates Nodev16 version lambda instead of Node18' },
    ], true);
  }
}
