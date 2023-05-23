import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { CloudFrontWebDistribution, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
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
  readonly cloudFrontWebDistribution: CloudFrontWebDistribution;
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
    const distribution = new CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: assetBucket,
            originAccessIdentity,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
            },
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 404,
          errorCachingMinTtl: 0,
          responseCode: 200,
          responsePagePath: '/',
        },
        {
          errorCode: 403,
          errorCachingMinTtl: 0,
          responseCode: 200,
          responsePagePath: '/',
        },
      ],
      loggingConfig: {
        bucket: accessLogBucket,
        prefix: 'Frontend/',
      },
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