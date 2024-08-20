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
 * File Version: 2024-03-19 14:06
 */

// ES6 | nodejs18+ | AWS SDK v3

import { storage } from './functions/storage-service.mjs';
import { lambdaCB } from './functions/lambda-utils.mjs';

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);
    const method = event.httpMethod;

    const cognitoGroups = event.requestContext.authorizer.claims['cognito:groups'] || '';
    const userGroups = cognitoGroups.split(',');

    const isLayoutEditor = userGroups.indexOf('CloudeeCMS-LayoutEditor') >= 0;
    const isUserAdmin = userGroups.indexOf('CloudeeCMS-UserAdmin') >= 0;
    const isAdmin = userGroups.indexOf('CloudeeCMS-Admin') >= 0;

    if (method === 'POST') {
        const payload = JSON.parse(event.body);
        const action = payload.action || '';

        // check if GSI1 exists
        await storage.checkGSI();

        if (action === 'getAllLayouts') {
            return cbHandler.success(await storage.getAllLayouts());
        } else if (action === 'getAllPages') {
            return cbHandler.success(await storage.getAllPages());
        } else if (action === 'getAllBlocks') {
            return cbHandler.success(await storage.getAllBlocks());
        } else if (action === 'getAllForms') {
            return cbHandler.success(await storage.getAllForms());
        } else if (action === 'getAllSubmittedForms') {
            return cbHandler.success(await storage.getAllSubmittedForms());
        } else if (action === 'getPublicationQueue') {
            return cbHandler.success(await storage.getPublicationQueue());
        } else if (action === 'getAllMT') {
            return cbHandler.success(await storage.getAllMicroTemplates());
        } else if (action === 'getItemByID') {
            return cbHandler.success(await storage.getItemByID(payload.params.id));
        } else if (action === 'getPageByID') {
            return cbHandler.success(await storage.getPageByID(payload.params.id));
        } else if (action === 'savePage') {
            return cbHandler.success(await storage.savePage(payload.params.obj));
        } else if (action === 'duplicatePage') {
            return cbHandler.success(await storage.duplicatePage(payload.params.id));
        } else if (action === 'saveForm') {
            return cbHandler.success(await storage.saveForm(payload.params.obj));
        } else if (action === 'addAllToPublicationQueue') {
            return cbHandler.success(await storage.addAllToPublicationQueue());
        } else if (action === 'getImageProfiles') {
            return cbHandler.success(await storage.getImageProfiles());
        } else if (action === 'saveImageProfiles') {
            return cbHandler.success(await storage.saveImageProfiles(payload.params.obj));
        } else if (action === 'deleteItemByID') {
            return cbHandler.success(await storage.deleteItemByID(payload.params.id));
        } else if (action === 'bulkDeleteItem') {
            return cbHandler.success(await storage.batchDelete(payload.params.lstIDs));
        } else if (action === 'getAllMTIDsInUse') {
            return cbHandler.success(await storage.getAllMTIDsInUse());
        } else if (action === 'getAllPagesByMT') {
            return cbHandler.success(await storage.getAllPagesByMT(payload.params.mtid));
        } else if (action === 'getConfig') {
            return cbHandler.success(await storage.getConfig(userGroups));
        }

        // Restricted to layouteditor
        if (isLayoutEditor || isAdmin) {
            if (action === 'saveLayout') {
                return cbHandler.success(await storage.saveLayout(payload.params.obj));
            } else if (action === 'saveBlock') {
                return cbHandler.success(await storage.saveBlock(payload.params.obj));
            } else if (action === 'saveMT') {
                return cbHandler.success(await storage.saveMicroTemplate(payload.params.obj));
            }
        }

        // Restricted to admin
        if (isAdmin) {
            if (action === 'saveConfig') {
                return cbHandler.success(await storage.saveConfig(payload.params.obj));
            }
        }

        return cbHandler.success({ success: false, message: "Not allowed: " + action });
    } else {
        return cbHandler.success({ success: false, message: "Method not supported" });
    }
};
