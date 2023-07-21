// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import AWS_SecretsManager = require("@aws-sdk/client-secrets-manager")

const { SecretsManager } = AWS_SecretsManager;
const ssm = new SecretsManager({
    region: process.env.AWS_REGION
});

export const getParamFromSSM = async (path: string) => {
    try {
        const query = {
            SecretId: path
        };
        const getParameterResult = await ssm.getSecretValue(query);

        if (getParameterResult === undefined) {
            console.error("Unable to getParameter with this query: " + query);
            return "No Data"
        } else {
            return getParameterResult.SecretString;
        }
    } catch (error) {
        console.error(`*** Error: ${error}`);
        return error
    }
};