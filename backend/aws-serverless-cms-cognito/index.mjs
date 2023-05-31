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
 * File Version: 2023-05-30 07:14 - RSC
 */

// ES6 | nodejs18+ | AWS SDK v3

import { cognitoSvc } from './functions/cognito-service.mjs';
import { lambdaCB } from './functions/lambda-utils.mjs';

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);
    const method = event.httpMethod;

    const cognitoGroups = event.requestContext.authorizer.claims['cognito:groups'] || '';
    const userGroups = cognitoGroups.split(',');

    const isUserAdmin = userGroups.indexOf('CloudeeCMS-UserAdmin') >= 0;
    const isAdmin = userGroups.indexOf('CloudeeCMS-Admin') >= 0;

    if (method === 'POST') {
        const payload = JSON.parse(event.body);
        const action = payload.action || '';

        if (action === 'listCognitoUsers') {
            return cbHandler.success(await cognitoSvc.listUsers(payload.params.maxResults, payload.params.nextToken));
        } else if (action === 'getCognitoUser') {
            return cbHandler.success(await cognitoSvc.getCognitoUser(payload.params.id));
        }

        // Only admin or useradmin below this point
        if (!isUserAdmin && !isAdmin) return cbHandler.success({ success: false, message: 'Not authorized' });

        if (action === 'saveCognitoUser') {
            return cbHandler.success(await cognitoSvc.saveCognitoUser(payload.params.usr));
        } else if (action === 'toggleCognitoUser') {
            return cbHandler.success(await cognitoSvc.toggleCognitoUser(payload.params.id, payload.params.enable));
        } else if (action === 'deleteCognitoUser') {
            return cbHandler.success(await cognitoSvc.deleteCognitoUser(payload.params.id));
        } else if (action === 'createCognitoUser') {
            return cbHandler.success(await cognitoSvc.createCognitoUser(payload.params.usr));
        } else if (action === 'listGroups') {
            return cbHandler.success(await cognitoSvc.listAllGroups());
        } else if (action === 'addUserToGroup') {
            return cbHandler.success(await cognitoSvc.addUserToGroup(payload.params.id, payload.params.groupname));
        } else if (action === 'removeUserFromGroup') {
            return cbHandler.success(await cognitoSvc.removeUserFromGroup(payload.params.id, payload.params.groupname));
        }
        return cbHandler.success({ success: false, message: "No Handle for action: " + action });
    } else {
        return cbHandler.success({ success: false, message: "Method not supported" });
    }
};
