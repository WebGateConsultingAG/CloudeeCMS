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
 * File Version: 2023-05-25 15:00 - RSC
 */

// ES6 | nodejs18+ | AWS SDK v3

import { s3service } from './functions/s3-service.mjs';
import { lambdaCB } from './functions/lambda-utils.mjs';

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);
    let method = event.httpMethod;

    if (method === 'POST') {
        const payload = JSON.parse(event.body);
        const action = payload.action || '';
        const bucketName = payload.params?.bucketName || '';

        if (!bucketName || bucketName === "") cbHandler.success({ success: false, message: 'Bucket name not supplied' });

        if (action === 'listFiles') {
            return cbHandler.success(await s3service.listFiles(bucketName, payload.params.bucketURL, payload.params.path));
        } else if (action === 'deleteFile') {
            return cbHandler.success(await s3service.deleteFile(bucketName, payload.params.key));
        } else if (action === 'batchDeleteFiles') {
            return cbHandler.success(await s3service.batchDelete(bucketName, payload.params.lstKeys));
        } else if (action === 'getsigneduploadpolicy') {
            return cbHandler.success(await s3service.getSignedUploadPolicy(bucketName, payload.params.keyPrefix, 'public-read'));
        } else if (action === 'createFolder') {
            return cbHandler.success(await s3service.createFolder(bucketName, payload.params.key));
        } else if (action === 'saveFile') {
            return cbHandler.success(await s3service.saveFile(bucketName, payload.params.fileInfo, payload.params.fileBody));
        } else if (action === 'getFile') {
            return cbHandler.success(await s3service.getFile(bucketName, payload.params.key));
        }

        return cbHandler.success({ success: false, message: "No Handle for action: " + action });
    } else {
        return cbHandler.success({ success: false, message: "Method not supported" });
    }
};
