// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import AWS = require('aws-sdk');
const ssm = new AWS.SSM({
    apiVersion: '2014-11-06'
});

export const getParamFromSSM = async (path: string) => {
    try {
        const query = {
            Name: path,
            WithDecryption: true,
        };
        const getParameterResult = await ssm.getParameter(query).promise();

        if (getParameterResult === undefined) {
            console.error("Unable to getParameter with this query: " + query);
            return "No Data"
        } else {
            return getParameterResult.Parameter?.Value;
        }
    } catch (error) {
        console.error(`*** Error: ${error}`);
        return error
    }
};