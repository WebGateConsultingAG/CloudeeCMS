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
 * File Version: 2020-08-04 09:54 - RSC
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sharp = require('sharp');

exports.handler = async function (event, context, callback) {
    const done = _done(callback);
    let method = event.httpMethod;
    if (method === 'POST') {
        let payload = JSON.parse(event.body);
        let action = payload.action ? payload.action : '';

        if (action === 'convertimages') {
            return convertImages(payload.bucketName, payload.targetpath, payload.lstFiles, payload.imageprofile, done);
        }

        done.error(new Error("No Handle for action: " + action));
    } else {
        done.error(new Error("Only POST is supported"));
    }
};

async function convertImages(s3BucketName, targetfolder, lstFiles, imageprofile, done) {
    let lstLog = [];
    try {
        let ccMaxAge = '259200';
        if (imageprofile.ccMaxAge && imageprofile.ccMaxAge !== '') {
            ccMaxAge = imageprofile.ccMaxAge;
        }
        lstFiles.forEach(async srcFile => {
            lstLog.push("Get " + srcFile + ' from ' + s3BucketName);
            const srcImg = await s3.getObject({ Bucket: s3BucketName, Key: srcFile }).promise();
            imageprofile.conversions.forEach(async imgc => {
                let newFile = sharp(srcImg.Body);
                if (imgc.convertwidth || imgc.convertheight) {
                    let resizeOpts = {};
                    if (imgc.convertwidth) resizeOpts.width = imgc.convertwidth;
                    if (imgc.convertheight) resizeOpts.height = imgc.convertheight;
                    console.log("resizeOpts", resizeOpts);
                    newFile = newFile.resize(resizeOpts);
                }

                let newContentType = srcImg.ContentType;
                let newFormat = imgc.convertformat || '';
                if (newFormat === '-') newFormat = '';
                if (newFormat !== '') {
                    newContentType = 'image/' + newFormat;
                    if (newFormat === 'jpeg' || newFormat === 'webp') {
                        newFile.toFormat(newFormat, { quality: (imgc.quality || 85) });
                    } else if (newFormat === 'png') {
                        newFile.toFormat(newFormat, { compressionLevel: (imgc.compressionLevel || 9) });
                    }
                }
                let targetPath = targetfolder + getNewFileName(srcFile, newFormat, imgc.suffix);

                lstLog.push("Upload to S3: " + targetPath);
                await s3putFile(s3BucketName, targetPath, newContentType, ccMaxAge, await newFile.toBuffer());
            });
            if (imageprofile.deleteOriginal) s3remove(s3BucketName, srcFile);
        });

        done.done({ processed: true, log: lstLog });
    } catch (e) {
        console.log(e);
        done.done({ processed: false, errorMessage: e.toString(), log: lstLog });
    }
}

function getNewFileName(srcFile, newFormat, suffix) {
    let newFile = srcFile;
    let lpos = srcFile.lastIndexOf("/");
    if (lpos > 0) newFile = srcFile.substr(lpos + 1, srcFile.length); // file without subdir
    let epos = newFile.lastIndexOf(".");
    let fileOnly = newFile.substr(0, epos);
    let extOnly = newFile.substr(epos + 1, newFile.length);
    return fileOnly + suffix + "." + (newFormat !== '' ? newFormat : extOnly);
}

async function s3putFile(s3BucketName, key, contentType, ccMaxAge, fileBody) {
    await s3.putObject({
        Bucket: s3BucketName,
        Key: key,
        Body: fileBody,
        ACL: 'public-read',
        ContentType: contentType,
        CacheControl: 'max-age=' + ccMaxAge
    }).promise();
}

async function s3remove(s3BucketName, opath) {
    console.log("Remove from S3", opath);

    await s3.deleteObject({
        Bucket: s3BucketName,
        Key: opath
    }).promise();
}

function _done(callback, headers) {
    let awsCB = {};
    awsCB.callback = callback;
    awsCB.headers = headers ? headers : {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Origin, Authorization, Accept, Client-Security-Token, Accept-Encoding'
    };
    awsCB.done = function (res) {
        awsCB.callback(null, {
            statusCode: 200,
            body: JSON.stringify({ success: true, data: res }),
            headers: awsCB.headers
        });
    };
    awsCB.error = function (err, httpCode) {
        awsCB.callback(null, {
            statusCode: httpCode ? httpCode : 400,
            body: JSON.stringify({ success: false, message: err.message || err }),
            headers: awsCB.headers
        });
    };
    return awsCB;
}
