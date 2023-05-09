#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import 'source-map-support/register';
import { InfrastructureStack } from '../lib/infrastructure-stack';
import { WebsiteStack } from '../lib/website-stack';

const app = new cdk.App();

const infra = new InfrastructureStack(app, 'InfrastructureStack', {
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
});

new WebsiteStack(app, 'WebsiteStack', {
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
  userPool: infra.userPool,
  client: infra.client,
  backendApi: infra.apigw,
})

cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))