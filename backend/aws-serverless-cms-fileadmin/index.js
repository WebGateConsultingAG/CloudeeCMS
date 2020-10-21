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
 * File Version: 2020-10-21 14:52 - RSC
 */

const s3service = require('./functions/s3-service').s3service;

exports.handler = function(event, context, callback) {
    const done = _done(callback);
    let method = event.httpMethod;

    if (method === 'POST') {
        
        let payload = JSON.parse(event.body);
        let action = payload.action || '';
        let bucketName = payload.bucketName || '';
        
        if (bucketName==="") return done.error(new Error("Bucket name not supplied"));
        
        if (action === 'listfiles') {
            let bucketURL = payload.bucketURL || '';
            return s3service.listFiles(bucketName, bucketURL, payload.path, done);
        } else if (action === 'deletefile') {
            return s3service.deleteFile(bucketName, payload.key, done);
        } else if (action === 'batchdeletefile') {
            return s3service.batchDelete(bucketName, payload.lstKeys, done);
        } else if (action === 'getsigneduploadpolicy') {
            return s3service.getSignedUploadPolicy(bucketName, payload.keyPrefix, 'public-read', done);
        } else if (action === 'createfolder') {
            return s3service.createFolder(bucketName, payload.key, done);
        } else if (action === 'savefile') {
            return s3service.saveFile(bucketName, payload.fileInfo, payload.fileBody, done);
        } else if (action === 'getfile') {
            return s3service.getFile(bucketName, payload.key, done);
        }

        done.error(new Error("No Handle for action: " + action));
    } else {
        done.error(new Error("Only POST is supported"));
    }
};

function _done(callback, headers) {
    let awsCB = {};
    awsCB.callback = callback;
    awsCB.headers = headers ? headers : { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Origin, Authorization, Accept, Client-Security-Token, Accept-Encoding'
    };
    awsCB.done = function(res) {
        awsCB.callback(null, {
            statusCode: 200,
            body: JSON.stringify({ success: true, data: res }),
            headers: awsCB.headers
        });
    };
    awsCB.error = function(err, httpCode) {
        awsCB.callback(null, {
            statusCode: httpCode ? httpCode : 400,
            body: JSON.stringify({ success: false, message: err.message || err }),
            headers: awsCB.headers
        });
    };
    return awsCB;
}