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
 * File Version: 2023-06-06 17:45 - RSC
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from 'sharp';

const s3client = new S3Client();
const storage = {};

storage.convertImages = async function (s3BucketName, targetfolder, lstFiles, imageprofile) {
  let lstLog = [];
  try {
    let ccMaxAge = '259200';
    if (imageprofile.ccMaxAge && imageprofile.ccMaxAge !== '') ccMaxAge = imageprofile.ccMaxAge;
    lstFiles.forEach(async srcFile => {
      lstLog.push("Get " + srcFile + ' from ' + s3BucketName);
      const srcImg = await s3getFile(s3BucketName, srcFile);

      imageprofile.conversions.forEach(async imgc => {
        console.log("Processing conversion", imgc);
        let newFile = sharp(srcImg);

        // Apply rotation info from metadata, if any (prevent rotated images taken using smartphones)
        newFile.rotate();

        if (imgc.convertwidth || imgc.convertheight) {
          let resizeOpts = {};
          if (imgc.convertwidth) resizeOpts.width = imgc.convertwidth;
          if (imgc.convertheight) resizeOpts.height = imgc.convertheight;

          // Prevent enlarge
          if (imgc.withoutEnlargement) resizeOpts.withoutEnlargement = true;

          // Set resize mode
          const resizeMode = imgc.resizeMode || '';
          if (resizeMode !== '') resizeOpts[resizeMode] = true;
          console.log("Resizing", resizeOpts);
          // newFile = newFile.resize(resizeOpts);
          newFile.resize(resizeOpts);
        }

        let newContentType = srcImg.ContentType;
        let newFormat = imgc.convertformat || '';
        if (newFormat === '-') newFormat = '';
        if (newFormat !== '') {
          newContentType = 'image/' + newFormat;
          console.log("Converting format", newFormat);
          if (newFormat === 'jpeg' || newFormat === 'webp') {
            newFile.toFormat(newFormat, { quality: (imgc.quality || 85) });
          } else if (newFormat === 'png') {
            newFile.toFormat(newFormat, { compressionLevel: (imgc.compressionLevel || 9) });
          }
        }

        let targetPath = targetfolder + getNewFileName(srcFile, newFormat, imgc.suffix, imgc.prefix);
        lstLog.push("Upload to S3: " + targetPath);
        console.log("Upload to S3", targetPath);
        await s3putFile(s3BucketName, targetPath, newContentType, ccMaxAge, await newFile.toBuffer());
      });
      if (imageprofile.deleteOriginal) await s3remove(s3BucketName, srcFile);
    });

    return { success: true, log: lstLog };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error', log: lstLog };
  }
};

function getNewFileName(srcFile, newFormat, suffix, prefix) {
  let sfx = suffix || '';
  let pfx = prefix || '';
  let newFile = srcFile;
  let lpos = srcFile.lastIndexOf("/");
  if (lpos > 0) newFile = srcFile.substr(lpos + 1, srcFile.length); // file without subdir
  let epos = newFile.lastIndexOf(".");
  let fileOnly = newFile.substr(0, epos);
  let extOnly = newFile.substr(epos + 1, newFile.length);
  return pfx + fileOnly + sfx + "." + (newFormat !== '' ? newFormat : extOnly);
}
async function s3putFile(s3BucketName, key, contentType, ccMaxAge, fileBody) {
  try {
    const command = new PutObjectCommand({
      Bucket: s3BucketName,
      Key: key,
      Body: fileBody,
      ACL: 'public-read',
      ContentType: contentType,
      CacheControl: 'max-age=' + ccMaxAge
    });
    let rc = await s3client.send(command);
    console.log("s3 response", rc);
    return true;
  } catch (e) {
    console.log("s3putFile() error", e);
    return false;
  }
}
async function s3getFile(Bucket, Key) {
  const stream = await s3client.send(new GetObjectCommand({ Bucket, Key })).then((response) => response.Body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
}
async function s3remove(Bucket, Key) {
  try {
    console.log("Remove from S3", Bucket, Key);
    const command = new DeleteObjectCommand({ Bucket, Key });
    await s3client.send(command);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export { storage };
