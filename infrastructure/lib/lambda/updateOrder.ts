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
    if (httpMethod == "PATCH") {
        if (!event.pathParameters || !event.body || !event.pathParameters.id) {
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
        const body = event.body;
        const editedItem: { partnerId: string, orderStatus: string } = JSON.parse(body);

        const orderId = event.pathParameters.id;
        const { partnerId, orderStatus } = editedItem;

        if (!partnerId || !orderId || !orderStatus) {
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
            const editedItemProperties = Object.keys(editedItem);
            if (!editedItem || editedItemProperties.length < 1) {
                return { statusCode: 400, body: 'invalid request, no arguments provided' };
            }

            const firstProperty = editedItemProperties.splice(0, 1);

            const key = { [ORDER_TABLE_PK]: orderId }
            const params = {
                TableName: ORDER_TABLE_NAME,
                Key: key,
                UpdateExpression: `set ${firstProperty} = :${firstProperty}`,
                ExpressionAttributeValues: {},
                ReturnValues: 'UPDATED_NEW'
            }
            params.ExpressionAttributeValues[`:${firstProperty}`] = editedItem[`${firstProperty}`];

            editedItemProperties.forEach(property => {
                params.UpdateExpression += `, ${property} = :${property}`;
                params.ExpressionAttributeValues[`:${property}`] = editedItem[property];
            });

            const orderInfo = await docClient.update(params).promise().then((data) => {
                return data
            }).catch((err) => {
                throw new Error(`Failed to get order info ${err}`);
            });

            console.info(`{ "message": ${JSON.stringify(orderInfo)}`);
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