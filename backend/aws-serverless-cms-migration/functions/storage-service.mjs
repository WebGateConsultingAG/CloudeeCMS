/*
 * Copyright WebGate Consulting AG, 2024
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
 * File Version: 2024-03-19 14:06
 */

import { documentClient, DDBQuery, DDBScan, DDBGet, getFormattedDate } from './lambda-utils.mjs'
const tableName = process.env.DB_TABLE || '';
const GSI1_NAME = 'GSI1-index';
const storage = {};

storage.getGSI1Status = async function () {
  let MIG_DONE = false;
  try { // check if GSI1 on table exists (for legacy installations)
    let cfg = await DDBGet({ TableName: tableName, Key: { id: "config" } });
    if (cfg && cfg.GSI1MIG === true) MIG_DONE = true;
    await DDBQuery({ TableName: tableName, IndexName: GSI1_NAME, KeyConditionExpression: 'otype = :hkey', ExpressionAttributeValues: { ':hkey': 'TEST' } });
    return { success: true, USE_GSI: true, MIG_DONE, TableName: tableName, IndexName: GSI1_NAME };
  } catch (e) {
    return { success: true, USE_GSI: false, MIG_DONE, TableName: tableName, IndexName: GSI1_NAME };
  }
};

storage.migrateGSI1 = async function () {
  try {
    let lst = [];

    lst.push(await addGSI1SK('MT'));      // Micro template      MT
    lst.push(await addGSI1SK('Block'));   // Layout block        Block
    lst.push(await addGSI1SK('Layout'));  // Layout              Layout
    lst.push(await addGSI1SK('Form'));    // Form definition     Form
    lst.push(await addGSI1SK('Page'));    // Page                Page
    lst.push(await addGSI1SK_SubmittedForm());  // Submitted form      SubmittedForm           YYYY-MM-DD/

    await documentClient.update({
      TableName: tableName, Key: { id: "config" },
      UpdateExpression: "set GSI1MIG = :q",
      ExpressionAttributeValues: { ":q": true }
    });

    return { success: true, lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

async function addGSI1SK(otype) {
  let cnt = 0;
  try {
    let lst = await DDBScan({
      TableName: tableName, FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': otype }, ProjectionExpression: 'id,GSI1SK'
    });
    console.log(otype + " found:", lst.length);

    const params = {
      TableName: tableName, Key: { id: "" },
      UpdateExpression: "set GSI1SK = :q",
      ExpressionAttributeValues: { ":q": "/" }
    };

    for (let i = 0; i < lst.length; i++) {
      if (!lst[i].GSI1SK) { // add GSI1SK = "/"
        params.Key.id = lst[i].id;
        await documentClient.update(params);
        cnt++;
      }
    }
    return { success: true, message: otype + ' updated', cnt };
  } catch (e) {
    console.log(e);
    return { success: false, message: 'Failed to migrate ' + otype, cnt };
  }
}
async function addGSI1SK_SubmittedForm() {
  let cnt = 0;
  try {
    let otype = 'SubmittedForm';
    let lst = await DDBScan({
      TableName: tableName, FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': otype }, ProjectionExpression: 'id,GSI1SK,dt'
    });
    console.log(otype + " found:", lst.length);

    for (let i = 0; i < lst.length; i++) {
      if (!lst[i].GSI1SK) { // add GSI1SK = "/"
        let dt = getFormattedDate(new Date(lst[i].dt || null)) + '/';
        let params = {
          TableName: tableName, Key: { id: lst[i].id },
          UpdateExpression: "set GSI1SK = :q",
          ExpressionAttributeValues: { ":q": dt }
        };
        await documentClient.update(params);
        cnt++;
      }
    }
    return { success: true, message: otype + ' updated', cnt };
  } catch (e) {
    console.log(e);
    return { success: false, message: 'Failed to migrate SubmittedForm', cnt };
  }
}
export { storage };
