import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { AccessLevel, Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { NodejsBuild } from 'deploy-time-build';

export interface FrontendProps {
  readonly userpool: UserPool
  readonly client: UserPoolClient,
  readonly backendApi: string,
  env: {
    account?: string,
    region?: string
  }
}

export class Frontend extends Construct {
  readonly cloudFrontWebDistribution: Distribution;
  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    const accessLogBucket = new Bucket(this, 'AccessLogBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
    });

    const assetBucket = new Bucket(this, 'AssetBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity');
    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(assetBucket, {
          originAccessLevels: [AccessLevel.READ, AccessLevel.LIST],
}),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 404,
          ttl: Duration.seconds(0),
          responseHttpStatus: 200,
          responsePagePath: '/',
        },
        {
          httpStatus: 403,
          ttl: Duration.seconds(0),
          responseHttpStatus: 200,
          responsePagePath: '/',
        },
      ],
      logBucket: accessLogBucket,
      logFilePrefix: 'Frontend/',
      enableLogging: true,
    });

    new NodejsBuild(this, 'ReactBuild', {
      assets: [
        {
          path: '../website',
          exclude: ['node_modules', 'build'],
          commands: ['rm -rf node_modules && rm -rf package-lock.json && npm install'],
          // prevent too frequent frontend deployment, for temporary use
          // assetHash: 'frontend_asset',
        },
      ],
      buildCommands: ['npm run build'],
      buildEnvironment: {
        REACT_APP_API_URL: props.backendApi,
        REACT_APP_USER_POOL_ID: props.userpool.userPoolId,
        REACT_APP_USER_POOL_CLIENT_ID: props.client.userPoolClientId,
        REACT_APP_AWS_REGION: Stack.of(props.userpool).region,
      },
      destinationBucket: assetBucket,
      distribution,
      outputSourceDirectory: 'build',
    });

    this.cloudFrontWebDistribution = distribution;
  }
}