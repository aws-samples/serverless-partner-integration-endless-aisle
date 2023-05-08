// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Imports
import { custom_resources } from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DDBTable } from "../common/storage/dynamoDB";
import { Partners } from '../constant/partners';

export interface DDBTableProps {
  readonly partnerMockAPIUrl: string
  readonly cloudWatchPolicyStatement: PolicyStatement
}

export class DDBTableConstructs extends Construct {

  // Public variables
  public readonly ordertable: ddb.Table;
  public readonly partnertable: ddb.Table;

  // Constructor
  constructor(scope: Construct, id: string, props: DDBTableProps) {
    super(scope, id);

    const orderTable = new DDBTable(this, 'OrderStoreStack', {
      tablename: 'orders',
      primaryKey: {
        name: "orderId",
        type: ddb.AttributeType.STRING,
      },
      gsi: [{
        partitionKey: {
          name: "orderStatus",
          type: ddb.AttributeType.STRING,
        },
        sortKey: {
          name: "createDate",
          type: ddb.AttributeType.NUMBER,
        }
      }],
      stream: ddb.StreamViewType.NEW_IMAGE,
      minCapacity: 1,
      maxCapacity: 50,
      targetUtilizationPercent: 50
    });

    const partnerTable = new DDBTable(this, 'PartnerStoreStack', {
      tablename: 'partners',
      primaryKey: {
        name: "partnerId",
        type: ddb.AttributeType.STRING,
      },
      gsi: [{
        partitionKey: {
          name: "category",
          type: ddb.AttributeType.STRING,
        },
        sortKey: {
          name: "name",
          type: ddb.AttributeType.STRING,
        }
      }],
      minCapacity: 1,
      maxCapacity: 50,
      targetUtilizationPercent: 50
    });

    const role = new Role(this, `${id}-customer-ddb-init-role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'CustomCloudWatchLogsPolicy': new PolicyDocument({
          statements: [props.cloudWatchPolicyStatement],
        })
      }
    })

    orderTable.table.grantReadWriteData(role);

    Partners.forEach(partner => {
      new custom_resources.AwsCustomResource(this, `${partner.name}ddbInitData`, {
        onCreate: {
          service: 'DynamoDB',
          action: 'putItem',
          parameters: {
            TableName: partnerTable.table.tableName,
            Item: {
              partnerId: { S: partner.partnerId },
              name: { S: partner.name },
              webhook: { S: props.partnerMockAPIUrl },
              category: { S: partner.category },
              impages: {
                L: [{ S: "test.jpg" }]
              }
            }
          },
          physicalResourceId: custom_resources.PhysicalResourceId.of(Date.now().toString()),
        },
        policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [partnerTable.table.tableArn],
        }),
        installLatestAwsSdk: true,
        role: role,
      })
    });

    this.ordertable = orderTable.table;
    this.partnertable = partnerTable.table;
  }
}