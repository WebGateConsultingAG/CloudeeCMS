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
 * File Version: 2020-06-19 0832 - RSC
 */

const DynamoDB = require('aws-sdk/clients/dynamodb');
const documentClient = new DynamoDB.DocumentClient({ convertEmptyValues: true });
const tableName = process.env.DB_TABLE || '';

const headers = { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Origin, Authorization, Accept, Client-Security-Token, Accept-Encoding'
};

exports.handler = async function (event, context, callback) { 
    try {
        var thisCategory = event.queryStringParameters['category'] || '';
        let params = {
            TableName: tableName,
            FilterExpression: "otype = :ot AND contains(#fldC, :v1)",
            ExpressionAttributeNames: { "#fldC": "categories" },
            ExpressionAttributeValues: { ":v1": thisCategory, ":ot": "Page" },
            ProjectionExpression: 'categories, opath, title, descr, dt, pubdate, img'
        };
        
        let lstPages = await DDBScan(params);
        lstPages.sort(function(a,b){
            return new Date(b.dt || b.pubdate) - new Date(a.dt || a.pubdate);
        });
    
        callback(null,
            {
                statusCode: 200,
                body: JSON.stringify({ success: true, data: lstPages }),
                headers: headers
            }
        );
        
    } catch (e) {
        console.error(e);
    }
};

async function DDBScan(params) {
    // this will scan beyond 1MB limit
    let lstRC = [];
    let hasMore = true;
    while (hasMore) {
        var data = await documentClient.scan(params).promise();
        data.Items.forEach(function(itemdata) {
            lstRC.push(itemdata);
        });
        if (typeof data.LastEvaluatedKey != "undefined") {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
        } else {
            hasMore = false;
        }
    }
    return lstRC;
}