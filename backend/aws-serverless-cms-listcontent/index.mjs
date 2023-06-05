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
 * File Version: 2023-06-05 15:36
 */

// ES6 | nodejs18+ | AWS SDK v3

import { lambdaCB, DDBScan } from './functions/lambda-utils.mjs';
const tableName = process.env.DB_TABLE || '';

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);
    const method = event.httpMethod;

    if (method === 'GET') {
        const thisCategory = event.queryStringParameters['category'] || '';
        const params = {
            TableName: tableName,
            FilterExpression: "otype = :ot AND contains(#fldC, :v1)",
            ExpressionAttributeNames: { "#fldC": "categories" },
            ExpressionAttributeValues: { ":v1": thisCategory, ":ot": "Page" },
            ProjectionExpression: 'categories, opath, title, descr, dt, pubdate, img'
        };

        const lstPages = await DDBScan(params); // TODO: migrate to GSI
        lstPages.sort((a, b) => {
            return new Date(b.dt || b.pubdate) - new Date(a.dt || a.pubdate);
        });

        return cbHandler.success({ success: true, data: lstPages });

    } else {
        return cbHandler.success({ success: false, message: "Method not supported" });
    }
};
