// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
import { getParamFromSSM } from './utils/getParameter';

const docClient = DynamoDBDocument.from(new DynamoDB({}));
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
            const partnerInfo = await docClient.get(params).then((data) => {
                return data.Item
            }).catch((err) => {
                throw new Error(`Failed to get partner info ${err}`);
            });
            if (!partnerInfo) {
                return { statusCode: 400, body: `invalid partner configuration` };
            }
            // Step 2 - Place order request 

            if (!process.env.TOKEN_PATH) {
                return { statusCode: 400, body: `Token path not found in partner configuration` };
            }
            const authorizationToken = await getParamFromSSM(process.env.TOKEN_PATH);
            if (authorizationToken === "No Data" || authorizationToken === undefined || authorizationToken === null || authorizationToken === "") {
                return { statusCode: 400, body: `Error getting token information from SSM` };
            }
            const requestURL = `${partnerInfo.webhook}inventory?itemId=${itemId}&partner=${partner}&partnerId=${partnerId}&quantity=${quantity}`;

            const config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: requestURL,
                headers: {
                    'authorizationToken': authorizationToken.toString().trim(),
                }
            };
            const itemInfo = await axios.request(config).then((response) => {
                return response.data
            }).catch((err) => {
                console.error(`Error connecting with Mock API sending a dummy response: ${err}`);
                return { statusCode: 400, body: "Request Failed" };
            });
            if (!itemInfo) {
                return { statusCode: 204, body: "Item Not found" };
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