// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

import { APIGatewayProxyEvent } from "aws-lambda";

// SPDX-License-Identifier: MIT-0
export const handler = async (event: APIGatewayProxyEvent) => {

    if (!event.body) {
        return {
            statusCode: 400,
            body: 'invalid request, missing the parameters  in body',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
    else {
        return {
            statusCode: 200,
            body: 'valid request',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
}