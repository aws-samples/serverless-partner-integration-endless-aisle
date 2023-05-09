// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

// Handler
interface mockInventoryRequest {
    itemId: string,
    partner: string,
    quantity: string
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Setup the parameters
    if (!event) {
        return {
            isBase64Encoded: false,
            statusCode: 404,
            body: JSON.stringify({ "message": "Invlide request" }),
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
                body: JSON.stringify({ "message": "Invlid parameters" }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
        const queryParameters = event.queryStringParameters;

        return handleHttpGetRequest(queryParameters);
    }

    else if (httpMethod == "POST") {
        if (!event.body) {
            return {
                isBase64Encoded: false,
                statusCode: 404,
                body: JSON.stringify({ "message": "Invlid body" }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
        const body = JSON.parse(event.body);
        return handleHttpPostRequest(body);
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

function handleHttpPostRequest(request: mockInventoryRequest): APIGatewayProxyResult {
    const { itemId, partner, quantity } = request;
    if (!itemId || !partner) {
        return {
            isBase64Encoded: false,
            statusCode: 404,
            body: JSON.stringify({ "message": `invalid request` }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    } else if (Number(itemId) < 100 && ["Partner1", "Partner2", "Partner3"].includes(partner) && Number(quantity) > 0) {
        const orderId: string = randomUUID();
        return {
            statusCode: 200,
            isBase64Encoded: false,
            body: JSON.stringify({
                statusCode: 200,
                message: `Order Placed for order id ${orderId} and reference item : ${itemId}`,
                orderId: `${orderId}`
            }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    } else {
        return {
            statusCode: 404,
            isBase64Encoded: false,
            body: JSON.stringify({ "message": `Order Failed for item - ${itemId}` }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    }
}

function handleHttpGetRequest(queryStringParameters: APIGatewayProxyEventQueryStringParameters): APIGatewayProxyResult {
    const { itemId, partner, quantity } = queryStringParameters;
    if (!itemId || !partner || !quantity) {
        return {
            isBase64Encoded: false,
            statusCode: 404,
            body: JSON.stringify({ "message": "invalid request" }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    } else if (Number(itemId) < 100 && ["Partner1", "Partner2", "Partner3"].includes(partner) && Number(quantity) > 0) {
        return {
            statusCode: 200,
            isBase64Encoded: false,
            body: JSON.stringify({ "message": "available" }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }

    } else {
        return {
            isBase64Encoded: false,
            statusCode: 404,
            body: JSON.stringify({ "message": "Not Found" }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    }
}