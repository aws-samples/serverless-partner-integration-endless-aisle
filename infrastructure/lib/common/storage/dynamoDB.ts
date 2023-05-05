// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Imports
import { RemovalPolicy } from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

// Properties for the datastore-stack
export interface DDBTableStackProps {
  readonly tablename: string,
  readonly primaryKey: ddb.Attribute,
  readonly minCapacity: number,
  readonly maxCapacity: number,
  readonly targetUtilizationPercent: number,
  readonly gsi: [{
    partitionKey: ddb.Attribute,
    sortKey: ddb.Attribute,
  }],
  readonly stream?: ddb.StreamViewType
}

export class DDBTable extends Construct {

  // Public variables
  public readonly table: ddb.Table;

  // Constructor
  constructor(scope: Construct, id: string, props: DDBTableStackProps) {
    super(scope, id);

    // Setup the database ----------------------------------------------------------------------------------------------
    this.table = new ddb.Table(this, `${props.tablename}-table`, {
      partitionKey: props.primaryKey,
      billingMode: ddb.BillingMode.PROVISIONED,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      stream: props.stream
    });

    // Add autoscaling
    const readScaling = this.table.autoScaleReadCapacity({
      minCapacity: props.minCapacity,
      maxCapacity: props.maxCapacity,
    });

    readScaling.scaleOnUtilization({
      targetUtilizationPercent: props.targetUtilizationPercent,
    });

    props.gsi.forEach(index => {
      this.table.addGlobalSecondaryIndex({
        ...index,
        indexName: `${props.tablename}-${index.partitionKey.name}-${index.sortKey.name}-index`,
      });
    });
    // Add a global secondary index for query operations
  }
}