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
 * File Version: 2023-06-07 13:22 - RSC
 */

// ES6 | nodejs18+ | AWS SDK v3

// This function gets triggered once by the CloudFormation template to download the most current
// deployment package for the CodePipeline.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import http from 'https';
import url from 'url';
const updURL = 'https://notifications.cloudee-cms.com/api/notifications';
const pipelineBucket = process.env.PIPELINE_BUCKET;
const webappBucket = process.env.WEBAPP_BUCKET;
const updateSourceFilename = '/tmp/deploy.zip';
const s3client = new S3Client();

export const handler = async (event, context, callback) => {
    try {
        console.log("*** URL of CloudeeCMS Editor will be: https://" + webappBucket + '/scms/index.html');
        let updateSrc = await httpGET(updURL + '?action=getlatestversion');
        console.log(`Downloading ${updateSrc.data.availableVersion} from ${updateSrc.data.updateURL}`);
        await httpDownload(updateSrc.data.updateURL, updateSourceFilename).then(
            () => { console.log("File downloaded") },
            async (err) => { console.log(err) }
        );
        if (!fs.existsSync(updateSourceFilename)) {
            console.warn('Failed to download update');
            return await cfSendResponse(event, context, "FAILED", { status: "Download FAILED", version: updateSrc.data.availableVersion });
        }
        console.log(updateSourceFilename, fs.statSync(updateSourceFilename));
        console.log('Uploading to S3', pipelineBucket);
        let fbuf = fs.readFileSync(updateSourceFilename);
        try {
            const s3command = new PutObjectCommand({ Bucket: pipelineBucket, Key: 'codepipeline/cloudeecms/deploy.zip', Body: fbuf, ContentType: 'application/zip' });
            await s3client.send(s3command);
        } catch (e) {
            console.warn('Failed to upload to s3', e);
            return await cfSendResponse(event, context, "SUCCESS", { status: "S3 Upload FAILED", version: updateSrc.data.availableVersion });
        }
        return await cfSendResponse(event, context, "SUCCESS", { status: "OK", version: updateSrc.data.availableVersion });
    } catch (e) {
        return await cfSendResponse(event, context, "SUCCESS", { status: "Script Error", version: "unknown" });
    }
};
const httpDownload = (url, dest) => {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let bytes = 0;
            let bodyChunks = [];
            res.on('data', chunk => {
                bodyChunks.push(chunk);
                bytes += chunk.length;
            });
            res.on('end', () => {
                let buf = new Buffer.alloc(bytes);
                let c = 0;
                for (let i = 0; i < bodyChunks.length; i++) {
                    bodyChunks[i].copy(buf, c, 0);
                    c += bodyChunks[i].length;
                }
                fs.writeFileSync(dest, buf, { flags: 'w', encoding: null, mode: 0o666 });
                resolve();
            });
        }).on('error', reject);
    });
};
function httpGET(url) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('statusCode=' + res.statusCode));
            let body = [];
            res.on('data', function (chunk) { body.push(chunk); });
            res.on('end', function () {
                try {
                    resolve(JSON.parse(Buffer.concat(body).toString()));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', (e) => { reject(e.message); });
        req.end();
    });
}

// cf-response - no longer included in AWS-SDK
async function cfSendResponse(event, context, responseStatus, responseData, physicalResourceId, noEcho) {
    return new Promise((resolve, reject) => {
        const responseBody = JSON.stringify({
            Status: responseStatus,
            Reason: "CloudWatch Log: " + context.logStreamName,
            PhysicalResourceId: physicalResourceId || context.logStreamName,
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            NoEcho: noEcho || false,
            Data: responseData
        });
        console.log("CF responseBody", responseBody);
        const parsedUrl = url.parse(event.ResponseURL);
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: "PUT",
            headers: { "content-type": "", "content-length": responseBody.length }
        };
        const request = http.request(options, (response) => {
            console.log("statusCode", response.statusCode);
            console.log("statusMessage", response.statusMessage);
            resolve();
        });
        request.on("error", (err) => {
            console.log("Failed to submit CF Response", err);
            resolve();
        });
        request.write(responseBody);
        request.end();
    });
}
