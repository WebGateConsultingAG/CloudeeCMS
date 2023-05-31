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
 * File Version: 2020-04-15 0607 - RSC
 */

// Algolia search indexer
// This function listens on SQS queue for indexing requests by the publish function
// Sample message: { "action": "add", "tableName": "", "indexName":"", "bucketName": "", ids": [] };


const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

const algoliasearch = require('algoliasearch');
const FTclient = algoliasearch(process.env.ALGOLIA_APPID, process.env.ALGOLIA_APIKEY);

const TASK_QUEUE_URL = process.env.TASK_QUEUE_URL;
const sqs = new AWS.SQS();

exports.handler = async function (event, context, callback) {

    let indexName = "";
    let FTindex = null;

    for (let m = 0; m < event.Records.length; m++) {
        var msg = event.Records[m];
        var msgObj = JSON.parse(msg.body);
        try {
            if (indexName !== msgObj.indexName) {
                indexName = msgObj.indexName;
                FTindex = FTclient.initIndex(indexName);
            }
            if (msgObj.action === "add") {
                for (let i = 0; i < msgObj.ids.length; i++) {
                    let doc = await documentClient.get({ TableName: msgObj.tableName, Key: { id: msgObj.ids[i] } }).promise();
                    if (doc && doc.Item) {
                        let putItem = doc.Item;
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
            await sqs.deleteMessage({ ReceiptHandle: msg.receiptHandle, QueueUrl: TASK_QUEUE_URL }).promise();

        } catch (e) {
            console.log(e);
        }
    }
};
