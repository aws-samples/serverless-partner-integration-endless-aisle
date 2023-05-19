// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { SQSEvent, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import axios from 'axios';
import { getParamFromSSM } from './utils/getParameter';
import { ItemRequestSchema, OrderSchema, OrderStatus } from "./utils/schema";

const docClient = new AWS.DynamoDB.DocumentClient();

const PARTNER_TABLE_NAME = process.env.PARTNER_TABLE_NAME || '';
const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME || '';
const PARTNER_TABLE_PK = process.env.PARTNER_TABLE_PK || '';
const OrderTax = 8;


interface requestOrderParmas {
    TableName: string,
    Item: OrderSchema
}

export const handler = async (event: SQSEvent) => {

    if (!event.Records) {
        return {
            statusCode: 400,
            body: 'invalid request, missing the parameters  in body',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
    const records: SQSRecord[] = event.Records;
    const record = records[0];
    const orderedItem: ItemRequestSchema = typeof record.body == 'object' ? record.body : JSON.parse(record.body);

    const { requestedItem, customer } = orderedItem;

    // Step 2 -Get Partner information
    const params = {
        TableName: PARTNER_TABLE_NAME,
        Key: {
            [PARTNER_TABLE_PK]: requestedItem.partnerId,
        }
    }
    console.debug(JSON.stringify(params));
    const partnerInfo = await docClient.get(params).promise().then((data) => {
        return data.Item
    }).catch((err) => {
        throw new Error(`Failed to get partner info ${err}`);
    });
    if (!partnerInfo) {
        return {
            statusCode: 400,
            body: `invalid partner configuration`,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
    console.debug(`create order - get partner info data: ${JSON.stringify(partnerInfo)}`);
    // Step 2 - Place order request 

    if (!process.env.TOKEN_PATH) {
        return {
            statusCode: 400,
            body: `Token path not found in partner configuration`,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
    const authorizationToken = await getParamFromSSM(process.env.TOKEN_PATH);
    if (authorizationToken === "No Data" || authorizationToken === undefined || authorizationToken === null || authorizationToken === "") {
        return {
            statusCode: 400,
            body: `Error getting token information from SSM`,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
    const requestURL = `${partnerInfo.webhook}inventory`;

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: requestURL,
        headers: {
            'authorizationToken': authorizationToken.toString().trim(),
        },
        data: requestedItem
    };

    const orderInfo = await axios(config)
        .then((data) => {
            console.debug(data);
            const orderId = data.data.orderId;
            return {
                statusCode: 200,
                message: `Order Placed for order id ${orderId} and reference item : ${requestedItem.itemId}`,
                orderId: `${orderId}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        })
        .catch((error) => {
            console.error(`Error connecting with Mock API sending a dummy response : ${error}`);
            return {
                statusCode: 400,
                message: `Order did not place: ${requestedItem.itemId}`,
                orderId: null,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        });

    if (!orderInfo || !orderInfo.orderId) {
        return {
            statusCode: 400,
            body: `order placement failed with message: ${orderInfo.message}`,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
    console.log(`Order update : ${JSON.stringify(orderInfo)}`);

    const reqParams: requestOrderParmas = {
        TableName: ORDER_TABLE_NAME,
        /* Item properties will depend on your application concerns */
        Item: {
            orderId: orderInfo.orderId,
            partnerId: requestedItem.partnerId,
            product: {
                itemId: requestedItem.itemId,
                quantity: requestedItem.quantity,
                size: requestedItem.size
            },
            messageId: event.Records[0].messageId,
            orderDate: new Date().getTime(),
            price: requestedItem.price,
            subtotal: Number(requestedItem.price) + Number(requestedItem.price) * (OrderTax / 100),
            salestax: `${OrderTax}%`,
            orderStatus: (orderInfo.statusCode == 200) ? OrderStatus.Completed : OrderStatus.Pending,
            statusDescription: orderInfo.message,
            partner: requestedItem.partner,
            subscribers: [{
                email: customer.email,
            }]
        }
    }
    const response = await docClient.put(reqParams).promise().then((res) => {
        return res.Attributes
    }).catch((err) => {
        throw new Error(`Failed to store data in DDB for order info ${err}`);
    });
    return {
        statusCode: 200,
        body: JSON.stringify(response),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    };
}