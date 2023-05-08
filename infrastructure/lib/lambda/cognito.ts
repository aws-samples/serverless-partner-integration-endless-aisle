// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

import { APIGatewayProxyEvent } from "aws-lambda";

// SPDX-License-Identifier: MIT-0
export const handler = async (event: APIGatewayProxyEvent) => {

    if (!event.body) {
        return { statusCode: 400, body: 'invalid request, missing the parameters  in body' };
    }
    else {
        console.log(JSON.stringify(event));
        return { statusCode: 200, body: 'valid request' };

    }
}