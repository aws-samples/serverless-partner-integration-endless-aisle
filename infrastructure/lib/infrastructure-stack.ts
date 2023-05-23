import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient, UserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ParameterTier, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { APIGatewayConstruct } from './common/apigateway/apiGateway';
import { WebACLConstruct } from './common/webacl/webacl';
import { DDBTableConstructs } from './constructs/ddb-tables';
import { Frontend } from './constructs/frontend';
import { ItemApiConstruct } from './constructs/item-api';
import { OrderApiConstruct } from './constructs/order-api';
import crypto = require('crypto');
// Properties for the ordering-stack

export class InfrastructureStack extends Stack {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  readonly apigw: RestApi;
  readonly endlessuserPoolDomain: UserPoolDomain;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id);

    const TokenPath = '/partnersite/token';
    /** Create Cloudwatch Policy for Lambda */

    const cloudWatchPolicyStatement = new PolicyStatement({
      actions: ["logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*:*`],
    });
    const cloudWatchPolicy = new Policy(this, `${id}-cloudwatch-policy`, {
      statements: [cloudWatchPolicyStatement],
    });

    const webacl = new WebACLConstruct(this, `${id}-webacl`);
    /** 
     * Create Partner API Mock versions
     */
    const partnerInventoryApi = new APIGatewayConstruct(this, 'partnerInventoryApi', {
      apiname: 'mockInventory',
      cloudWatchPolicyStatement: cloudWatchPolicyStatement,
      TOKEN_PATH: TokenPath,
      webacl: webacl.wafwebacl
    });

    NagSuppressions.addResourceSuppressions(partnerInventoryApi.api, [
      { id: 'AwsSolutions-COG4', reason: 'Partner API is based on Custom Lambda Authorizer' },
    ], true);
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
      },
      cognitoUserPoolClientProps: {
        generateSecret: false,
        oAuth: {
          flows: {
            authorizationCodeGrant: false,
            implicitCodeGrant: true,
            clientCredentials: false,
            refreshTokens: true
          }
        }
      }
    });

    const domainPrefix = "endlessaisle"

    const endlessuserPoolDomain = new UserPoolDomain(this, `endless-aisle-user-pool-domain`, {
      userPool: congitoToApiGwToLambda.userPool,
      cognitoDomain: {
        domainPrefix: domainPrefix
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

    const orderapi = new OrderApiConstruct(this, 'order-api', {
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
        TOKEN_PATH: TokenPath
      },
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway,
      cloudWatchPolicy: cloudWatchPolicy
    });
    /**
     * Items API
     * */

    const itemapi = new ItemApiConstruct(this, 'item-api', {
      ordertable: dynamoDBTables.ordertable,
      partnertable: dynamoDBTables.partnertable,
      partnerInventoryApi: partnerInventoryApi.api,
      env: {
        account: props.env?.account,
        region: props.env?.region,
      },
      STORE_EMAIL: process.env.STORE_EMAIL,
      lambdaEnviroment: {
        ORDER_TABLE_PK: 'orderId',
        PARTNER_TABLE_PK: 'partnerId',
        ORDER_TABLE_ARN: dynamoDBTables.ordertable.tableArn,
        PARTNER_TABLE_ARN: dynamoDBTables.partnertable.tableArn,
        ORDER_TABLE_NAME: dynamoDBTables.ordertable.tableName,
        PARTNER_TABLE_NAME: dynamoDBTables.partnertable.tableName,
        TOKEN_PATH: TokenPath
      },
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway,
      cloudWatchPolicyStatement: cloudWatchPolicyStatement
    });

    // Add the authorizers to the API

    congitoToApiGwToLambda.addAuthorizers();

    // This construct can only be attached to a configured API Gateway.
    new WafwebaclToApiGateway(this, `${id}-wafwebacl-apigateway`, {
      existingApiGatewayInterface: congitoToApiGwToLambda.apiGateway,
      existingWebaclObj: webacl.wafwebacl
    });

    this.userPool = congitoToApiGwToLambda.userPool;
    this.client = congitoToApiGwToLambda.userPoolClient;
    this.apigw = congitoToApiGwToLambda.apiGateway;
    this.endlessuserPoolDomain = endlessuserPoolDomain;


    const generatePassword = (
      length = 8,
      wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    ) =>
      Array.from(crypto.randomFillSync(new Uint32Array(length)))
        .map((x) => wishlist[x % wishlist.length])
        .join('')

    const accessTokenString = process.env.PARTNER_ACCESS_TOKEN ? process.env.PARTNER_ACCESS_TOKEN : generatePassword();
    const accessToken = new StringParameter(this, 'partnerAccessToken', {
      parameterName: TokenPath,
      stringValue: accessTokenString,
      description: 'the token is used to test API',
      tier: ParameterTier.STANDARD,
      allowedPattern: '.*',
    });
    accessToken.grantRead(partnerInventoryApi.inventoryLambda);
    accessToken.grantRead(orderapi.createOrderLambda);
    accessToken.grantRead(itemapi.getItemLambda);

    const wafwebaclToCloudFrontToS3 = new Frontend(this, 'EndlessAisleFrontEnd', {
      env: {
        account: props.env?.account,
        region: props.env?.region
      },
      userpool: this.userPool,
      client: this.client,
      backendApi: this.apigw.url,
    });

    new CfnOutput(this, "domainurl", { value: `${wafwebaclToCloudFrontToS3.cloudFrontWebDistribution.distributionDomainName}` });


    new CfnOutput(this, 'userPoolId', {
      value: this.userPool.userPoolId
    });
    new CfnOutput(this, 'userPoolClientId', {
      value: this.client.userPoolClientId,
    });
    new CfnOutput(this, 'region', {
      value: this.region
    });

    NagSuppressions.addResourceSuppressions(scope, [
      { id: 'AwsSolutions-IAM5', reason: 'Suppressing IAM5 for roles generated by solution constructs' },
      { id: 'AwsSolutions-CB4', reason: 'Suppressing CB4 for roles generated by solution constructs' },
      { id: 'AwsSolutions-IAM4', reason: 'Suppressing IAM4 for roles generated by solution constructs' },
      { id: 'AwsSolutions-S1', reason: 'As W35, This S3 bucket is used as the access logging bucket for CloudFront Distribution' },
      { id: 'AwsSolutions-CFR4', reason: 'Since the distribution uses the CloudFront domain name, CloudFront automatically sets the security policy to TLSv1 regardless of the value of MinimumProtocolVersion' },
      { id: 'AwsSolutions-L1', reason: 'AWS Cloudformation custom resource creates Nodev16 version lambda instead of Node18' },
      { id: 'AwsSolutions-APIG4', reason: 'Options methods are not not behind Authorizer' },
      { id: 'AwsSolutions-COG4', reason: 'Options method are not not behind Authorizer' }
    ], true);
  }
}
