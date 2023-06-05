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
 * File Version: 2023-06-05 09:58 - RSC
 */

import { pubSVC } from './functions/publish-service.mjs';
import { feedSVC } from './functions/feed-service.mjs';
import { lambdaCB, DDBGet } from './functions/lambda-utils.mjs';
const tableName = process.env.DB_TABLE || '';

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);
    const method = event.httpMethod;

    if (method === 'POST') {

        const cfg = await DDBGet({ TableName: tableName, Key: { id: "config" } });
        if (!cfg) return cbHandler.success({ success: false, published: false, errorMessage: "Configuration document not found", log: [] });

        const payload = JSON.parse(event.body);
        const action = payload.action ? payload.action : '';

        if (action === 'publishPage') {
            return cbHandler.success(await pubSVC.publishPage(payload.params.targetenv, payload.params.id, payload.params.page, cfg));
        } else if (action === 'bulkPublishPage') {
            return cbHandler.success(await pubSVC.bulkPublishPage(payload.params.targetenv, payload.params.lstPageIDs, payload.params.pubtype, payload.params.removeFromQueue, cfg));
        } else if (action === 'unpublishPage') {
            return cbHandler.success(await pubSVC.unpublishPage(payload.params.targetenv, payload.params.id, payload.params.opath, cfg));
        } else if (action === 'publishFeeds') {
            return cbHandler.success(await feedSVC.publishFeeds(payload.params.targetenv, payload.params.lstFeeds, cfg));
        }

        return cbHandler.success({ success: false, message: "No handle for: " + action });
    } else {
        return cbHandler.success({ success: false, message: "Method not supported" });
    }
};
