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

const lambdaCB = (callback, headers) => {
    const awsCB = {};
    awsCB.callback = callback;
    awsCB.headers = headers ? headers : {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Origin, Authorization, Accept, Client-Security-Token, Accept-Encoding'
    };
    awsCB.success = function (res) {
        awsCB.callback(null, { statusCode: 200, body: JSON.stringify(res), headers: awsCB.headers });
    };
    awsCB.error = function (err, httpCode) { // staus 400 -> not returned to caller
        console.log(err);
        awsCB.callback(null, {
            statusCode: httpCode ? httpCode : 400,
            body: JSON.stringify({ message: err.message || err }),
            headers: awsCB.headers
        });
    };
    return awsCB;
};

export { lambdaCB };
