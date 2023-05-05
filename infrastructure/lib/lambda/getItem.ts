// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { sign } from 'aws4';
import axios, { Method } from 'axios';
const docClient = new AWS.DynamoDB.DocumentClient();

interface SignedRequest {
    method: Method;
    service: string;
    region: string;
    host: string;
    headers: Record<string, string>;
    body: string;
}

const PARTNER_TABLE_NAME = process.env.PARTNER_TABLE_NAME || '';
const PARTNER_TABLE_PK = process.env.PARTNER_TABLE_PK || '';

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
        if (!event.queryStringParameters && !event.pathParameters) {
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
        const queryParameters = event.queryStringParameters;
        const itemId = event.pathParameters?.id;
        const partner = queryParameters?.partner;
        const partnerId = queryParameters?.partnerId;
        const quantity = queryParameters?.quantity;
        if (!partnerId || !partner || !itemId || !quantity) {
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
            const key = { [PARTNER_TABLE_PK]: partnerId }
            const params = {
                TableName: PARTNER_TABLE_NAME,
                Key: key
            }
            const partnerInfo = await docClient.get(params).promise().then((data) => {
                return data.Item
            }).catch((err) => {
                throw new Error(`Failed to get partner info ${err}`);
            });
            if (!partnerInfo) {
                return { statusCode: 400, body: `invalid partner configuration` };
            }
            // Step 2 - Place order request 

            const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN } = process.env
            const host: string[] = partnerInfo.webhook.split("/");

            const service: string[] = host[2].split(".");

            // Sign request
            const signed = sign({
                method: 'GET',
                service: `${service[1]}}`,  //`${service[0]}.${service[1]}}`,
                region: process.env.DEFAULT_REGION,
                host: host[2],
                headers: {
                    'Content-Type': 'application/json'
                }
            }, {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
                sessionToken: AWS_SESSION_TOKEN
            }) as SignedRequest

            const requestURL = `${partnerInfo.webhook}inventory?itemId=${itemId}&partner=${partner}&partnerId=${partnerId}&quantity=${quantity}`;
            console.log(`requested URL ${requestURL}`);
            const itemInfo = await axios({
                ...signed,
                url: requestURL
            }).then((response) => {
                return response.data
            }).catch((err) => {
                // throw new Error(`Failed to send order info ${err}`);
                console.error(`Error connecting with Mock API sending a dummy response: ${err}`);
                // For Sample Sending a dummy response in case of Mock error.
                return { message: "available" }
            });
            if (!itemInfo) {
                return { statusCode: 400, body: "Item Not found" };
            }
            console.log(`Item for order info : ${JSON.stringify(itemInfo)}`);
            return {
                statusCode: 200,
                isBase64Encoded: false,
                body: JSON.stringify({ "message": JSON.stringify(itemInfo) }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
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