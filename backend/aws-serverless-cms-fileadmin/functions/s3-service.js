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
 * File Version: 2020-07-23 07:53 - RSC
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

const s3service = {};

s3service.deleteFile = function(bucketname, key, done) {
  
  var params = { Bucket: bucketname, Key: key };
  console.log("delete object from s3", params);
  
  s3.deleteObject(params, function(err, data) {
      if (err) {
        console.error(err);
        done.done({error: err});
      } else {
        done.done( { success: true } );
      }
  });
};

s3service.createFolder = function(bucketname, key, done) {
  var params = { Bucket: bucketname, Key: key };
  s3.putObject(params, function(err, data) {
      if (err) {
        console.error(err);
        done.done({error: err});
      } else {
        done.done( { success: true } );
      }
  });
};

// For online file editor
s3service.saveFile = function(bucketName, fileInfo, fileBody, done) {
  var params = { 
    Bucket: bucketName, 
    Key: fileInfo.key, 
    Body: fileBody, 
    ContentType: fileInfo.contentType,
    ACL: 'public-read',
    CacheControl: 'max-age=259200'
  };
  s3.putObject(params, function(err, data) {
      if (err) {
        console.error(err);
        done.done({error: err});
      } else {
        done.done( { success: true } );
      }
  });
};

// For online file editor
s3service.getFile = function(bucketName, key, done) {
  var params = { Bucket: bucketName, Key: key };
  s3.getObject(params, function(err, data) {
      if (err) {
        console.error(err);
        done.done({error: err});
      } else {
        done.done( { success: true, fileObj: { 
          ContentType: data.ContentType,
          LastModified: data.LastModified,
          Body: Buffer.from(data.Body).toString()
        } } );
      }
  });
};

s3service.listFiles = function(bucketname, bucketURL,  strPath, done) {
    var params = {
      Bucket: bucketname, /* required */
      Delimiter: '/',
      Prefix: strPath
    };
    s3.listObjects(params, function(err, data) {
      if (err) {
        console.error(err);
        done.done({error: err});
      } else {
        var lst = [];
        if (data.CommonPrefixes) {
            data.CommonPrefixes.forEach(itm=>{ 
               lst.push( { otype: 'Folder', Key: itm.Prefix, label: getLabelFromKey(itm.Prefix)} );
            });
        }
        if (data.Contents) {
            data.Contents.forEach(entry=>{ 
                if (strPath!==entry.Key) { 
                    lst.push( { 
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
        done.done( { lstFiles: lst } );
      }
    });
    
};

s3service.getSignedUploadPolicy = function(bucketname, keyPrefix, acl, done) {
    var params3 = {
        Bucket: bucketname,
        Conditions: [ 
          ['starts-with', '$key', keyPrefix],
          ['starts-with', '$Content-Type', ''],
          ['starts-with', '$Cache-Control', ''], // Allow cache control options
          { 'acl': 'public-read' }  // Allow ACL field in HTTP POST request, must appear before the file field!
        ],
        Expires: 3600,
        success_action_status: 200
    };

    s3.createPresignedPost(params3, function(err, data) {
      if (err) {
        console.error('Presigning post data encountered an error', err);
        done.error(new Error('Error in getSignedUploadPolicy()'));
      } else {
        done.done(data);
      }
    });
};

s3service.getSignedDownloadURL = function(bucketname, s3key, done) {
  var params = {Bucket: bucketname, Key: s3key, Expires: 3600};
  s3.getSignedUrl('getObject', params, function (err, url) {
    if (err) {
      console.log("Error in getSignedDownloadURL()", err);
      done.error(new Error('Error in getSignedDownloadURL()'));
    } else {
      done.done({url: url});
    }
  });
};

function getLabelFromKey(key) {
    try {
        // only show last element of tree
        let tmp = key.split('/');
        if (key.endsWith('/')) { 
            return tmp[tmp.length-2]; // folder
        } else {
            return tmp[tmp.length-1]; // file
        }
    } catch (e) {
        return key;
    }
}

function isEditable(key) {
  var lp = key.lastIndexOf('.');
  if (lp < 1) return false;
  var fExt = key.substr( lp+1, key.length).toLowerCase();
  var editableExt = ['js', 'css'];
  return editableExt.indexOf(fExt)>=0;
}
module.exports.s3service = s3service;