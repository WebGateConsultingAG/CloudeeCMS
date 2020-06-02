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
 * File Version: 2020-04-15 0607 - RSC
 */

const AWS = require('aws-sdk');
const cloudfront = new AWS.CloudFront();
const cfSvc = {};

cfSvc.invalidateCF = function(distribID, lstPaths, done) {
    if (!distribID || distribID==='') return done.done({"success": false, "errorMessage": "CloudFront Distribution ID not specified in Lambda Function"});

    var params = {
      DistributionId: distribID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: lstPaths.length,
          Items: lstPaths
        }
      }
    };
    
    cloudfront.createInvalidation(params, function(err, data) {
      if (err) {
            console.error(err, err.stack);
            done.done({"success": false, "errorMessage": err.toString()});
        } else {
            done.done({"success": true, "cfresponse": data});
        }
    });    
};

module.exports.cfSvc = cfSvc;