// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { SQSEvent, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { sign } from 'aws4';
import { v4 as uuidv4 } from 'uuid';
import { ItemRequestSchema, OrderSchema, OrderStatus } from "./utils/schema";
import https = require('https');

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
        return { statusCode: 400, body: 'invalid request, missing the parameters  in body' };
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
        return { statusCode: 400, body: `invalid partner configuration` };
    }
    console.debug(`create order - get partner info data: ${JSON.stringify(partnerInfo)}`);
    // Step 2 - Place order request 

    const host: string[] = partnerInfo.webhook.split("/");

    const service: string[] = host[2].split(".");

    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN } = process.env

    const orderInfo = await httpsRequest(sign({
        service: `${service[0]}.${service[1]}`,
        region: process.env.DEFAULT_REGION,
        method: 'POST',
        path: `/prod/inventory`
    }, {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        sessionToken: AWS_SESSION_TOKEN
    }), requestedItem)
        .then((data) => {
            console.log(data);
            return {
                statusCode: 200,
                message: `Order Placed for order id ${data} and reference item : ${requestedItem.itemId}`,
                orderId: `${data}`
            }
        })
        .catch((error) => {
            console.error(`Error connecting with Mock API sending a dummy response : ${error}`);
            const orderId = uuidv4();
            return {
                statusCode: 200,
                message: `Order Placed for order id ${orderId} and reference item : ${requestedItem.itemId}`,
                orderId: orderId
            }
        });

    if (!orderInfo) {
        return { statusCode: 400, body: `order placement failed` };
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
    return { statusCode: 200, body: JSON.stringify(response) };
}


async function httpsRequest(params, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(params, (res) => {
            console.log(`Params ${JSON.stringify(params)}`);
            // reject on bad status
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('statusCode=' + res.statusCode));
            }
            // cumulate data
            let body: Uint8Array[] = [];
            res.on('data', (chunk: Uint8Array) => body.push(chunk));
            // resolve on end
            res.on('end', () => {
                try {
                    if (res.headers['content-type'] === 'application/json') {
                        body = JSON.parse(Buffer.concat(body).toString());
                    }
                } catch (e) {
                    reject(e);
                }
                resolve(body);
            });
        });
        // reject on request error
        req.on('error', (err) => {
            // This is not a "Second reject", just a different sort of failure
            reject(err);
        });
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        // IMPORTANT
        req.end();
    });
}