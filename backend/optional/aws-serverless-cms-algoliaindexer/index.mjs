/*
 * Copyright WebGate Consulting AG, 2020
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); 
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at:
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software 
 * distributed under the License is distributed on an "AS IS" BASIS, 
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or 
 * implied. See the License for the specific language governing 
 * permissions and limitations under the License.
 * 
 * File Version: 2023-06-05 1315 - RSC
 */

// Algolia search indexer
// This function listens on SQS queue for indexing requests by the publish function
// Sample message: { "action": "add", "tableName": "", "indexName":"", "bucketName": "", ids": [] };

// ES6 | nodejs18+ | AWS SDK v3

import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { DDBGet } from './functions/lambda-utils.mjs';
import algoliasearch from 'algoliasearch';

const FTclient = algoliasearch(process.env.ALGOLIA_APPID, process.env.ALGOLIA_APIKEY);
const TASK_QUEUE_URL = process.env.TASK_QUEUE_URL;
const sqsclient = new SQSClient({});

export const handler = async (event, context, callback) => {
    let indexName = "";
    let FTindex = null;

    for (let m = 0; m < event.Records.length; m++) {
        let msg = event.Records[m];
        let msgObj = JSON.parse(msg.body);
        try {
            if (indexName !== msgObj.indexName) {
                indexName = msgObj.indexName;
                FTindex = FTclient.initIndex(indexName);
            }
            if (msgObj.action === "add") {
                for (let i = 0; i < msgObj.ids.length; i++) {
                    let putItem = await DDBGet({ TableName: msgObj.tableName, Key: { id: msgObj.ids[i] } });
                    if (putItem) {
                        putItem.objectID = putItem.id;
                        await FTindex.saveObject(putItem);
                    }
                }
            } else if (msgObj.action === "remove") {
                for (let i = 0; i < msgObj.ids.length; i++) {
                    console.log("Remove", msgObj.ids[i], indexName);
                    await FTindex.deleteObject(msgObj.ids[i]);
                }
            }

            let command = new DeleteMessageCommand({ ReceiptHandle: msg.receiptHandle, QueueUrl: TASK_QUEUE_URL });
            await sqsclient.send(command);

        } catch (e) {
            console.log(e);
        }
    }
};