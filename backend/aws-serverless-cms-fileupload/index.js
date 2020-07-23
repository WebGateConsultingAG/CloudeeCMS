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
 * File Version: 2020-07-23 0730 - RSC
 */

// trumbowyg pasted images uploader - courtesy of flexion 2019
// Please note that this method of fileupload has a limit of 6MB payload
// For larger files please use presigned upload URLs.
// Use aws-lambda-multipart-parser version 0.1.2! 0.1.3 will not work. 

'use strict';

const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });
const s3 = new AWS.S3();
const multipart = require('aws-lambda-multipart-parser');

const S3_PATH = process.env.S3_PATH || 'img/pasted/';
const tableName = process.env.DB_TABLE || '';

exports.handler = async (event, context, callback) => {
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
    var filesObj = multipart.parse(event, false);
    var imgFile = filesObj.fileToUpload;
    if (!imgFile) return done(null, { success: false, message: 'no fileToUpload found in multipart-parser' } );
    if (!imgFile.contentType.startsWith("image/")) return done(null, { success: false, message: 'Unsupported content-type ('+imgFile.contentType+')' } );
    
    let doc = await documentClient.get({ TableName: tableName, Key: { id:  "config" }}).promise();
    if (doc && doc.Item) {
        let bucketcfg = getUploadBucketConfig(doc.Item);
        if (!bucketcfg) return done(null, { success: false, message: 'No bucket enabled for pasted images found in configuration'} );

        // use CDN url if you have one, or https://s3.eu-central-1.amazonaws.com/"+S3_BUCKET
        const WEB_URL = bucketcfg.cdnURL===''?bucketcfg.cdnURL+'/':bucketcfg.webURL;
        const dstKey = S3_PATH+guid()+".png";
        await s3upload(bucketcfg.bucketname, dstKey, imgFile);
        // Response for trumbowyg editor
        console.log("response", { success: true, url: WEB_URL+dstKey });
        done(null, { success: true, url: WEB_URL+dstKey } );
    } else {
        return done(null, { success: false, message: 'Configuration not found in dynamodb table: '+tableName } );
    }
};

async function s3upload(s3BucketName, dstKey, file) {
    console.log("Upload to S3:", s3BucketName, dstKey);
    await s3.putObject({
        Bucket: s3BucketName,
        Key: dstKey,
        Body: file.content,
        ACL:'public-read',
        ContentType: file.contentType,
        CacheControl: 'max-age=172800'
    }).promise();
}

function getUploadBucketConfig(config) {
    for (let b in config.buckets) if (config.buckets[b].pastedImages) return config.buckets[b];
    return null;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
