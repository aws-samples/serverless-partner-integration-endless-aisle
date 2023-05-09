// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Imports
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

// Properties for the datastore-stack

export class WebACLConstruct extends Construct {

    // Public variables
    public readonly wafwebacl: CfnWebACL;

    // Constructor
    constructor(scope: Construct, id: string) {
        super(scope, id);
        const wafwebacl = new CfnWebACL(this, "WebAcl", {
            defaultAction: { allow: {} },
            //see all AWS managed rules https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html#aws-managed-rule-groups-use-case
            // Count just counts the number of request matches the rules for now. https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-testing.html
            rules: [
                {
                    priority: 1,
                    overrideAction: { count: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
                    },
                    name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesKnownBadInputsRuleSet",
                        },
                    },
                },
                {
                    priority: 2,
                    overrideAction: { count: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWS-AWSManagedRulesCommonRuleSet",
                    },
                    name: "AWS-AWSManagedRulesCommonRuleSet",
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesCommonRuleSet",
                        },
                    },
                },
                {
                    priority: 3,
                    overrideAction: { count: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWS-AWSManagedRulesAnonymousIpList",
                    },
                    name: "AWS-AWSManagedRulesAnonymousIpList",
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesAnonymousIpList",
                        },
                    },
                },
                {
                    priority: 4,
                    overrideAction: { count: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWS-AWSManagedRulesAmazonIpReputationList",
                    },
                    name: "AWS-AWSManagedRulesAmazonIpReputationList",
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesAmazonIpReputationList",
                        },
                    },
                },
                {
                    priority: 5,
                    overrideAction: { count: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWS-AWSManagedRulesAdminProtectionRuleSet",
                    },
                    name: "AWS-AWSManagedRulesAdminProtectionRuleSet",
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesAdminProtectionRuleSet",
                        },
                    },
                },
                {
                    priority: 6,
                    overrideAction: { count: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWS-AWSManagedRulesSQLiRuleSet",
                    },
                    name: "AWS-AWSManagedRulesSQLiRuleSet",
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesSQLiRuleSet",
                        },
                    },
                }
            ],
            scope: 'REGIONAL',
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: "web-acl",
            },
        });
        this.wafwebacl = wafwebacl;
    }
}