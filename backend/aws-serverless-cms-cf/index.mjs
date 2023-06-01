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
 * File Version: 2023-05-31 14:50 - RSC
 */

// ES6 | nodejs18+ | AWS SDK v3

import { cfService } from './functions/cf-service.mjs';
import { lambdaCB } from './functions/lambda-utils.mjs';

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);
    const method = event.httpMethod;

    if (method === 'POST') {
        const payload = JSON.parse(event.body);
        const action = payload.action || '';

        if (action === 'invalidateCF') {
            return cbHandler.success(await cfService.invalidateCF(payload.params.targetCF, payload.params.lstPaths));
        }

        return cbHandler.success({ success: false, message: "Action not supported: " + action });
    } else {
        return cbHandler.success({ success: false, message: "Method not supported" });
    }
};
