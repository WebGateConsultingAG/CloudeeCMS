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
 * File Version: 2023-05-26 07:34 - RSC
 */

import { S3Client, ListObjectsCommand, DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const client = new S3Client();
const s3service = {};

s3service.listFiles = async function (bucketname, bucketURL, strPath) {
  try {
    const command = new ListObjectsCommand({
      Bucket: bucketname,
      Delimiter: "/",
      Prefix: strPath
    });
    const data = await client.send(command);
    const lst = [];
    if (data.CommonPrefixes) {
      data.CommonPrefixes.forEach(itm => {
        lst.push({ otype: 'Folder', Key: itm.Prefix, label: getLabelFromKey(itm.Prefix) });
      });
    }
    if (data.Contents) {
      data.Contents.forEach(entry => {
        if (strPath !== entry.Key) {
          lst.push({
            Key: entry.Key,
            LastModified: entry.LastModified,
            Size: entry.Size,
            label: getLabelFromKey(entry.Key),
            link: bucketURL + entry.Key,
            otype: 'File',
            editable: isEditable(entry.Key)
          });
        }
      });
    }
    return { success: true, lstFiles: lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

s3service.deleteFile = async function (bucketname, key) {
  try {
    const command = new DeleteObjectCommand({ Bucket: bucketname, Key: key });
    await client.send(command);
    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

s3service.batchDelete = async function (bucketname, lstKeys) {
  try {
    console.log("delete objects from s3", bucketname, lstKeys);
    const keys = [];
    for (let k in lstKeys) keys.push({ Key: lstKeys[k] });
    const command = new DeleteObjectsCommand({ Bucket: bucketname, Delete: { Objects: keys, Quiet: false } });
    const data = await client.send(command);
    return { success: true, msg: data };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

s3service.createFolder = async function (bucketName, key) {
  try {
    const command = new PutObjectCommand({ Bucket: bucketName, Key: key });
    await client.send(command);
    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

// For online file editor
s3service.saveFile = async function (bucketName, fileInfo, fileBody) {
  try {
    let cc = fileInfo.cacheControl || 'max-age=172800';
    if (cc === '') cc = 'max-age=172800';
    const params = {
      Bucket: bucketName,
      Key: fileInfo.key,
      Body: fileBody,
      ContentType: fileInfo.contentType,
      CacheControl: cc,
      ACL: 'public-read'
    };
    const command = new PutObjectCommand(params);
    await client.send(command);
    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

// For online file editor
s3service.getFile = async function (bucketName, key) {
  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const data = await client.send(command);
    const bodyContent = await data.Body.transformToString();
    return {
      success: true,
      fileObj: {
        ContentType: data.ContentType,
        LastModified: data.LastModified,
        CacheControl: data.CacheControl,
        Body: bodyContent
      }
    };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
s3service.getSignedUploadPolicy = async function (bucketName, keyPrefix, acl) {
  try {
    const params = {
      Bucket: bucketName,
      Conditions: [
        ['starts-with', '$key', keyPrefix],
        ['starts-with', '$Content-Type', ''],
        ['starts-with', '$Cache-Control', ''], // Allow cache control options
        { 'acl': acl || 'public-read' }  // Allow ACL field in HTTP POST request, must appear before the file field!
      ],
      Fields: { success_action_status: '200' },
      Key: '${filename}' // in SDK v3 you MUST supply a key, even if keyPrefix condition allows multiple files to be uploaded.
    };
    const data = await createPresignedPost(client, params);
    // We remove the key field from the returned policy, because we allow to upload multiple files
    delete data.fields.key;
    return { success: true, data };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

s3service.getSignedDownloadURL = async function (bucketName, key) {
  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // expires, in seconds
    return { success: true, url };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

function getLabelFromKey(key) {
  try {
    // only show last element of tree
    let tmp = key.split('/');
    if (key.endsWith('/')) {
      return tmp[tmp.length - 2]; // folder
    } else {
      return tmp[tmp.length - 1]; // file
    }
  } catch (e) {
    return key;
  }
}

function isEditable(key) {
  var lp = key.lastIndexOf('.');
  if (lp < 1) return false;
  var fExt = key.substr(lp + 1, key.length).toLowerCase();
  var editableExt = ['js', 'css'];
  return editableExt.indexOf(fExt) >= 0;
}

export { s3service };
