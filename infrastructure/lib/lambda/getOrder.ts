// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME || '';
const ORDER_TABLE_PK = process.env.ORDER_TABLE_PK || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Setup the parameters
    if (!event) {
        return {
            isBase64Encoded: false,
            statusCode: 404,
            body: JSON.stringify({ "message": "Invalid request" }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
    const httpMethod = event.httpMethod;
    if (httpMethod == "GET") {
        if (!event.queryStringParameters) {
            return {
                isBase64Encoded: false,
                statusCode: 404,
                body: JSON.stringify({ "message": "Invalid parameters" }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
        const orderId = event.pathParameters?.id;

        if (!orderId) {
            return {
                isBase64Encoded: false,
                statusCode: 404,
                body: JSON.stringify({ "message": "invalid request parameters" }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        } else {
            const key = { [ORDER_TABLE_PK]: orderId }
            const params = {
                TableName: ORDER_TABLE_NAME,
                Key: key
            }
            const orderInfo = await docClient.get(params).promise().then((data) => {
                return data.Item
            }).catch((err) => {
                throw new Error(`Failed to get order info ${err}`);
            });
            console.log(`{ "message": ${JSON.stringify(orderInfo)}`);
            if (orderInfo) {
                return {
                    statusCode: 200,
                    isBase64Encoded: false,
                    body: JSON.stringify({ "message": orderInfo }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }

            } else {

                return {
                    statusCode: 200,
                    isBase64Encoded: false,
                    body: JSON.stringify({ "message": `Order Data not found` }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            }
        }
    }
    else {
        return {
            isBase64Encoded: false,
            statusCode: 405,
            body: JSON.stringify({ "message": "Method Not Supported" }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
}