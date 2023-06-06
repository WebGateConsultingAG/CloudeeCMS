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
 * File Version: 2023-03-27 14:00 RSC
 */

import https from 'https';
import querystring from 'querystring';

const reCAPTCHAv3 = {};

reCAPTCHAv3.verifyResponse = async function (secret, reCAPTCHAResponse, clientIP) {
    try {
        let rc = await queryReCAPTCHA(secret, reCAPTCHAResponse, clientIP);
        return rc || { success: false };
    } catch (e) {
        console.log(e);
        return { success: false, error: e, message: e.message || 'Unknown error' };
    }
};
function queryReCAPTCHA(secret, reCAPTCHAResponse, clientIP) {
    const body = querystring.stringify({ "response": reCAPTCHAResponse, "secret": secret, "remoteip": clientIP || '' });
    const options = {
        hostname: 'www.google.com', path: '/recaptcha/api/siteverify', method: 'POST', port: 443,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let rawData = '';
            res.on('data', chunk => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(rawData));
                } catch (err) {
                    reject(new Error(err));
                }
            });
        });
        req.on('error', err => {
            reject(new Error(err));
        });
        req.write(body);
        req.end();
    });
}
export { reCAPTCHAv3 };
