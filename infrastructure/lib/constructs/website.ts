// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { Construct } from 'constructs';

import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { WafwebaclToCloudFront } from "@aws-solutions-constructs/aws-wafwebacl-cloudfront";
import { CfnOutput } from 'aws-cdk-lib';
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { GeoRestriction, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";

// Properties for the website-stack
export interface WebsiteStackProps {
  readonly dnsname?: string,
  readonly dns?: string,
  readonly userpool: UserPool
  readonly client: UserPoolClient,
  readonly backendApi: RestApi,
}

export class Website extends Construct {
  public readonly cloudfrontURL: string;
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id);
    if (props.dnsname) {
      new CfnOutput(this, "distributionDNSurl", { value: props.dnsname });
    }

    const cloudfrontToS3 = new CloudFrontToS3(this, 'website-cloudfront-s3', {
      cloudFrontDistributionProps: {
        defaultRootObject: 'index.html',
        geoRestriction: GeoRestriction.allowlist("US"),
      }
    });

    // This construct can only be attached to a configured CloudFront.
    new WafwebaclToCloudFront(this, 'weebsite-wafwebacl-cloudfront', {
      existingCloudFrontWebDistribution: cloudfrontToS3.cloudFrontWebDistribution
    });

    new BucketDeployment(this, 'BucketDeployment', {
      destinationBucket: cloudfrontToS3.s3BucketInterface,
      sources: [Source.asset(path.resolve(__dirname, '../../../website/build'))],
      accessControl: BucketAccessControl.PRIVATE,
      exclude: ['node_modules', 'src'],
      retainOnDelete: false
    })

    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity');
    cloudfrontToS3.s3Bucket?.grantRead(originAccessIdentity);

    this.cloudfrontURL = cloudfrontToS3.cloudFrontWebDistribution.distributionDomainName;

    new CfnOutput(this, "distributionurl", { value: cloudfrontToS3.cloudFrontWebDistribution.distributionDomainName });
  }
}
