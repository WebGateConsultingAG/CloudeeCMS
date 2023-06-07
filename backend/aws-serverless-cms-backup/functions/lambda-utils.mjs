/*
 * Copyright WebGate Consulting AG, 2023
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
 */

import { DynamoDB } from "@aws-sdk/client-dynamodb"; // ES6 import
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
};
const unmarshallOptions = { wrapNumbers: false };
const translateConfig = { marshallOptions, unmarshallOptions };
const client = new DynamoDB({});
const documentClient = DynamoDBDocument.from(client, translateConfig); // fullclient

const getNewGUID = (formatString) => {
    return (formatString || 'xxxx-xyxxx-xxxyy-xxx').replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
const DDBGet = async (params) => {
    let itm = await documentClient.get(params);
    if (!itm || !itm.Item) return null;
    return itm.Item;
};
const DDBQuery = async (params) => {
    // this will query beyond 1MB limit
    let lstRC = [];
    let hasMore = true;
    delete params.ExclusiveStartKey; // make sure there is no lastevaluated key from a previous run
    while (hasMore) {
        let data = await documentClient.query(params);
        data.Items.forEach((itemdata) => {
            lstRC.push(itemdata);
        });
        if (typeof data.LastEvaluatedKey != "undefined") {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
        } else {
            hasMore = false;
        }
    }
    return lstRC;
};
const DDBScan = async (params) => {
    // this will scan beyond 1MB limit. This shouldn't be used unless you REALLY know what the impact is
    let lstRC = [];
    let hasMore = true;
    delete params.ExclusiveStartKey; // make sure there is no lastevaluated key from a previous run
    while (hasMore) {
        let data = await documentClient.scan(params);
        data.Items.forEach((itemdata) => {
            lstRC.push(itemdata);
        });
        if (typeof data.LastEvaluatedKey != "undefined") {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
        } else {
            hasMore = false;
        }
    }
    return lstRC;
};
const getFormattedDate = (strDT) => {
    try {
        if (!strDT || strDT === '') return '';
        let dt = new Date(strDT);
        dt.setMinutes(dt.getMinutes()); // do not substract offset when TZ in lambda is set! - dt.getTimezoneOffset());
        const newDT = dt.getFullYear() + '-';
        const m = dt.getMonth() + 1;
        const d = dt.getDate();
        return newDT + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
    } catch (e) {
        console.log(e);
        return '';
    }
};
const lambdaCB = (callback, headers) => {
    const awsCB = {};
    awsCB.callback = callback;
    awsCB.headers = headers ? headers : {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Origin, Authorization, Accept, Client-Security-Token, Accept-Encoding'
    };
    awsCB.success = function (res) {
        awsCB.callback(null, { statusCode: 200, body: JSON.stringify(res), headers: awsCB.headers });
    };
    awsCB.error = function (err, httpCode) { // staus 400 -> not returned to caller
        console.log(err);
        awsCB.callback(null, {
            statusCode: httpCode ? httpCode : 400,
            body: JSON.stringify({ message: err.message || err }),
            headers: awsCB.headers
        });
    };
    return awsCB;
};

export { documentClient, lambdaCB, getFormattedDate, getNewGUID, DDBGet, DDBQuery, DDBScan };
