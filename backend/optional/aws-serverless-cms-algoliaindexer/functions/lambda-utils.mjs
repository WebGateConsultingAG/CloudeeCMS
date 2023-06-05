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

const DDBGet = async (params) => {
    let itm = await documentClient.get(params);
    if (!itm || !itm.Item) return null;
    return itm.Item;
};

export { documentClient, DDBGet };
