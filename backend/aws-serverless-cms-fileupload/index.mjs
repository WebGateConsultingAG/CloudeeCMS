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
 * File Version: 2023-06-05 15:04 - RSC
 */

// trumbowyg pasted images uploader - courtesy of flexion 2019
// Please note that this method of fileupload has a limit of 6MB payload
// For larger files please use presigned upload URLs.
// Use aws-lambda-multipart-parser version 0.1.2! 0.1.3 will not work. 

// ES6 | nodejs18+ | AWS SDK v3

import { lambdaCB, getNewGUID, DDBGet } from './functions/lambda-utils.mjs';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multipart from 'aws-lambda-multipart-parser';

const S3_PATH = process.env.S3_PATH || 'img/pasted/';
const tableName = process.env.DB_TABLE || '';
const s3client = new S3Client();

export const handler = async (event, context, callback) => {
    const cbHandler = lambdaCB(callback);

    let filesObj = multipart.parse(event, false);
    let imgFile = filesObj.fileToUpload;
    if (!imgFile) return cbHandler.success({ success: false, message: 'no fileToUpload found in multipart-parser' });
    if (!imgFile.contentType.startsWith("image/")) return cbHandler.success({ success: false, message: 'Unsupported content-type (' + imgFile.contentType + ')' });

    let doc = await DDBGet({ TableName: tableName, Key: { id: "config" } });
    if (doc) {
        let bucketcfg = getUploadBucketConfig(doc);
        if (!bucketcfg) return cbHandler.success({ success: false, message: 'No bucket enabled for pasted images found in configuration' });

        // use CDN url if you have one, or https://s3.eu-central-1.amazonaws.com/"+S3_BUCKET
        const WEB_URL = bucketcfg.cdnURL === '' ? bucketcfg.cdnURL + '/' : bucketcfg.webURL;
        const dstKey = S3_PATH + getNewGUID() + ".png";
        await s3upload(bucketcfg.bucketname, dstKey, imgFile);
        // Response for trumbowyg editor
        return cbHandler.success({ success: true, url: WEB_URL + dstKey });
    } else {
        return cbHandler.success({ success: false, message: 'Configuration not found in dynamodb table: ' + tableName });
    }
};

async function s3upload(s3BucketName, dstKey, file) {
    try {
        console.log("Upload to S3:", s3BucketName, dstKey);
        const params = {
            Bucket: s3BucketName,
            Key: dstKey,
            Body: file.content,
            ACL: 'public-read',
            ContentType: file.contentType,
            CacheControl: 'max-age=259200'
        };
        const command = new PutObjectCommand(params);
        await s3client.send(command);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

function getUploadBucketConfig(config) {
    for (let b in config.buckets) if (config.buckets[b].pastedImages) return config.buckets[b];
    return null;
}
