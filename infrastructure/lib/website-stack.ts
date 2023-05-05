import { Construct } from 'constructs';

import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Website } from './constructs/website';


// Properties for the website-stack
export interface WebsiteStackProps extends StackProps {
  userPool: UserPool,
  client: UserPoolClient,
  backendApi: RestApi
}

export class WebsiteStack extends Stack {
  readonly cloudfrontURL: string;
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    const wafwebaclToCloudFrontToS3 = new Website(this, 'EndlessAisleFrontEnd', {
      userpool: props.userPool,
      client: props.client,
      backendApi: props.backendApi,
    });
    // TODO remove unneccessary CFN OutPut
    new CfnOutput(this, "domainurl", { value: wafwebaclToCloudFrontToS3.cloudfrontURL });
  }
}
