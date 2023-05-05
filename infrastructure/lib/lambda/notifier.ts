// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Function to send a message to SNS topic

import { DynamoDBStreamEvent } from 'aws-lambda';

import * as AWS from 'aws-sdk';

const SES_EMAIL_FROM = process.env.SES_EMAIL_FROM || "";

export const handler = async (event: DynamoDBStreamEvent) => {
    if (!event.Records) {
        return Promise.resolve(event).then(event => {
            console.log(JSON.stringify(event));
            return { statusCode: 400, body: 'invalid request, missing the parameters in body' };
        });
    }
    else {
        // Read event from dynamoDB stream and send email using SES service to email field in event record body
        const record = event.Records[0];
        console.log(JSON.stringify(`Record : ${JSON.stringify(record)}\n}`));
        console.log(JSON.stringify(`Event : ${JSON.stringify(event)}\n}`));

        if (record.dynamodb) {
            if (!record.dynamodb || !record.dynamodb.NewImage) {
                return Promise.resolve(event).then(event => {
                    console.log(JSON.stringify(event));
                    return { statusCode: 400, body: 'invalid request, missing the parameters in body' };
                });
            } else {
                const newImage = AWS.DynamoDB.Converter.unmarshall(
                    record.dynamodb.NewImage as { [key: string]: AWS.DynamoDB.AttributeValue }
                );
                try {

                    const orderId = newImage.orderId;
                    const statusDescription = newImage.statusDescription;
                    const email = newImage.subscribers[0].email;
                    console.log(`Email : ${email} \nOrderStatus : ${statusDescription} \nOrderId : ${orderId} \n`);

                    if (!orderId || !email || !statusDescription)
                        throw new Error('Properties name, email and message are required');

                    return await sendEmail(orderId, email, statusDescription);
                } catch (error: unknown) {
                    console.log('ERROR is: ', error);
                    if (error instanceof Error) {
                        return JSON.stringify({ body: { error: error.message }, statusCode: 400 });
                    }
                    return JSON.stringify({
                        body: { error: JSON.stringify(error) },
                        statusCode: 400,
                    });
                }
            }

        } else {
            return Promise.resolve(event).then(event => {
                console.log(JSON.stringify(event));
                return { statusCode: 400, body: 'invalid request, missing the parameters in body' };
            });
        }
    }
}


export type ContactDetails = {
    orderId: string;
    email: string;
    orderStatus: string;
};

async function sendEmail(orderId: string, email: string, orderStatus: string) {
    const subject = `Update for order ${orderId}`;

    const ses = new AWS.SES({ apiVersion: '2010-12-01' }
    );
    ses.config.update({ region: process.env.AWS_REGION });

    const template = `Order ${orderId} for email ${email} \n has been updated to ${orderStatus} \n please check the status of the order`

    const emailParams = {
        Destination: {
            ToAddresses: [SES_EMAIL_FROM],
        },
        Message: {
            Body: {
                Text: { Data: template },
            },
            Subject: { Data: subject },
        },
        Source: SES_EMAIL_FROM,
    };

    try {
        const key = await ses.sendEmail(emailParams).promise();
        console.log("MAIL SENT SUCCESSFULLY!!" + key);
    } catch (e) {
        console.log("FAILURE IN SENDING MAIL!!", e);
    }
    return;
}