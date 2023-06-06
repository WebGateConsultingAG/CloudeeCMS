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
 * File Version: 2023-06-06 07:02 - RSC
 */

// ES6 | nodejs18+ | AWS SDK v3

import { codebuildSVC } from './functions/codebuild-service.mjs';
import { backupSVC } from './functions/backup-service.mjs';
import { lambdaCB } from './functions/lambda-utils.mjs';

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);
    const method = event.httpMethod;

    const cognitoGroups = event.requestContext.authorizer.claims['cognito:groups'] || '';
    const userGroups = cognitoGroups.split(',');
    const isAdmin = userGroups.indexOf('CloudeeCMS-Admin') >= 0;

    if (method === 'POST') {
        const payload = JSON.parse(event.body);
        const action = payload.action || '';
        if (isAdmin) {
            if (action === 'importPackage') {
                return cbHandler.success(await backupSVC.importPackage(payload.params.targetenv, payload.params.s3key));
            } else if (action === 'createBackup') {
                return cbHandler.success(await backupSVC.createBackup(payload.params.targetenv));
            } else if (action === 'startUpdate') {
                return cbHandler.success(await codebuildSVC.startUpdate(payload.params));
            }
        }

        if (action === 'getpipelinestatus') {
            return cbHandler.success(await codebuildSVC.getPipelineStatus());
        } else if (action === 'getbuildprojectinfo') {
            return cbHandler.success(await codebuildSVC.getBuildProjectInfo());
        }

        return cbHandler.success({ success: false, message: "Not allowed: " + action });
    } else {
        return cbHandler.success({ success: false, message: "Method not supported" });
    }
};
