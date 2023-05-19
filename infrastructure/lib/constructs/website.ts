// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { Construct } from 'constructs';

import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { WafwebaclToCloudFront } from "@aws-solutions-constructs/aws-wafwebacl-cloudfront";
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { GeoRestriction, HeadersReferrerPolicy, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { HttpMethod } from "aws-cdk-lib/aws-lambda";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";

// Properties for the website-stack
export interface WebsiteStackProps {
  readonly dnsname?: string,
  readonly dns?: string,
  readonly userpool: UserPool
  readonly client: UserPoolClient,
  readonly backendApi: RestApi,
  env: {
    account?: string,
    region?: string
  },
}

export class Website extends Construct {
  public readonly cloudfrontURL: string;
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id);
    if (props.dnsname) {
      new CfnOutput(this, "distributionDNSurl", { value: props.dnsname });
    }
    const allowedConnectDomains = [
      "'self'",
      "https://*.amazonaws.com",
      "https://*.amazoncognito.com",
      "https://*.cloudfront.net",
      "https://cognito-identity.us-east-1.amazonaws.com"
    ]
    // Creating a custom response headers policy -- all parameters optional
    const websiteResponseHeadersPolicyProps = {
      responseHeadersPolicyName: 'WebsiteResponsePolicy',
      comment: 'A default policy',
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS],
        accessControlAllowOrigins: ['*'],
        accessControlMaxAge: Duration.seconds(600),
        originOverride: true,
      },
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: `default-src ${allowedConnectDomains.join(' ')}; connect-src ${allowedConnectDomains.join(' ')};`, override: true
        },
        contentTypeOptions: { override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.NO_REFERRER, override: true },
        strictTransportSecurity: { accessControlMaxAge: Duration.seconds(600), includeSubdomains: true, override: true },
      },
    };

    const cloudfrontToS3 = new CloudFrontToS3(this, 'website-cloudfront-s3', {
      cloudFrontDistributionProps: {
        defaultRootObject: 'index.html',
        geoRestriction: GeoRestriction.allowlist("US")
      },
      responseHeadersPolicyProps: websiteResponseHeadersPolicyProps,
      insertHttpSecurityHeaders: false
    });

    // This construct can only be attached to a configured CloudFront.
    new WafwebaclToCloudFront(this, 'website-wafwebacl-cloudfront', {
      existingCloudFrontWebDistribution: cloudfrontToS3.cloudFrontWebDistribution
    });

    const role = new Role(this, `${id}-custom-bucket-deployment-role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'BucketDeploymentPolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"],
              resources: [`arn:aws:logs:${props.env.region}:${props.env.account}:*`],
            })],
        })
      }
    })

    new BucketDeployment(this, 'BucketDeployment', {
      destinationBucket: cloudfrontToS3.s3BucketInterface,
      sources: [Source.asset(path.resolve(__dirname, '../../../website/build'))],
      accessControl: BucketAccessControl.PRIVATE,
      exclude: ['node_modules', 'src'],
      retainOnDelete: false,
      role: role
    })

    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity');
    cloudfrontToS3.s3Bucket?.grantRead(originAccessIdentity);

    this.cloudfrontURL = cloudfrontToS3.cloudFrontWebDistribution.distributionDomainName;

    new CfnOutput(this, "distributionurl", { value: cloudfrontToS3.cloudFrontWebDistribution.distributionDomainName });
  }
}
