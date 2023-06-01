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
 * File Version: 2023-05-31 14:57 - RSC
 */

import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

const client = new CloudFrontClient({});
const cfService = {};

cfService.invalidateCF = async function (distribID, lstPaths) {
  try {
    if (!distribID || distribID === '') return { success: false, message: "CloudFront Distribution ID not specified" };

    const input = { // CreateInvalidationRequest
      DistributionId: distribID,
      InvalidationBatch: {
        Paths: {
          Quantity: lstPaths.length,
          Items: lstPaths,
        },
        CallerReference: Date.now().toString()
      },
    };
    const command = new CreateInvalidationCommand(input);
    const cfresponse = await client.send(command);
    return { success: true, cfresponse };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

export { cfService };
