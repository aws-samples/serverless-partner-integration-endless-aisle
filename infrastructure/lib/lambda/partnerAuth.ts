// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyEvent } from "aws-lambda";
import { getParamFromSSM } from "./utils/getParameter";

export const handler = async (event: APIGatewayProxyEvent) => {
    let auth = "Deny"
    if (!event.headers['authorizationToken']) {
        return { statusCode: 400, body: 'invalid request, missing the parameters  in body' };
    } else if (!process.env.TOKEN_PATH) {
        return { statusCode: 400, body: 'invalid request, missing the parameters  in body' };
    }
    else {
        const authToken = event.headers['authorizationToken'];
        const ssmSecret = await getParamFromSSM(process.env.TOKEN_PATH);
        if (ssmSecret === "No Data" || ssmSecret === undefined || ssmSecret === null || ssmSecret === "") {
            auth = "Deny"
        }
        else if (!authToken || authToken !== await ssmSecret.toString().trim()) {
            auth = "Deny"
        } else {
            auth = "Allow"
        }
    }
    const authResponse = { "principalId": "PartnerCognito", "policyDocument": { "Version": "2012-10-17", "Statement": [{ "Action": "execute-api:Invoke", "Resource": event['methodArn'], "Effect": auth }] } }
    console.log(`authResponse: ${JSON.stringify(authResponse)}`);
    return authResponse
}