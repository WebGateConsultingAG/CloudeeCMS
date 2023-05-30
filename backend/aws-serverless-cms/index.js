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
 * File Version: 2023-05-30 0726 - RSC
 */

const storage = require('./functions/storage-service').storage;
const cfService = require('./functions/cloudfront-service').cfSvc;

exports.handler = function(event, context, callback) {
    const done = _done(callback);

    const cognitoGroups = event.requestContext.authorizer.claims['cognito:groups'] || '';
    const userGroups = cognitoGroups.split(',');

    let isLayoutEditor = userGroups.indexOf('CloudeeCMS-LayoutEditor') >= 0;
    let isUserAdmin = userGroups.indexOf('CloudeeCMS-UserAdmin') >= 0;
    let isAdmin = userGroups.indexOf('CloudeeCMS-Admin') >= 0;
    
    let method = event.httpMethod;
    if (method === 'POST') {
        
        let payload = JSON.parse(event.body);
        let action = payload.action ? payload.action : '';

        if (action === 'getalllayouts') {
            return storage.getAllLayouts(done);
        } else if (action === 'getallpages') {
            return storage.getAllPages(done);
        } else if (action === 'getallblocks') {
            return storage.getAllBlocks(done);
        } else if (action === 'getallforms') {
            return storage.getAllForms(done);
        } else if (action === 'getallsubmittedforms') {
            return storage.getAllSubmittedForms(done);
        } else if (action === 'getpublicationqueue') {
            return storage.getPublicationQueue(done);
        } else if (action === 'getallmt') {
            return storage.getAllMicroTemplates(done);
        } else if (action === 'getitembyid') {
            return storage.getItemByID(payload.id, done);
        } else if (action === 'getpagebyid') {
            return storage.getPageByID(payload.id, done);
        } else if (action === 'savepage') {
            return storage.savePage(payload.obj, done);
        } else if (action === 'duplicatepage') {
            return storage.duplicatePage(payload.id, done);
        } else if (action === 'saveform') {
            return storage.saveForm(payload.obj, done);
        } else if (action === 'addalltopublicationqueue') {
            return storage.addAllToPublicationQueue(done);
        } else if (action === 'invalidateCF') {
            return cfService.invalidateCF(payload.targetCF, payload.lstPaths, done);
        } else if (action === 'getconfig') {
            return storage.getConfig(userGroups, done);
        } else if (action === 'getimageprofiles') {
            return storage.getImageProfiles(done);
        } else if (action === 'saveimageprofiles') {
            return storage.saveImageProfiles(payload.obj , done);
        } else if (action === 'deleteitembyid') {
            return storage.deleteItemByID(payload.id, done);
        } else if (action === 'bulkdeleteitem') {
            return storage.batchDelete(payload.lstIDs, done);
        } else if (action === 'getallmtidsinuse') {
            return storage.getAllMTIDsInUse(done);
        } else if (action === 'getallpagesbymt') {
            return storage.getAllPagesByMT(payload.mtid, done);
        }
        // Restricted to layouteditor
        if (isLayoutEditor || isAdmin) {
            if (action === 'savelayout') {
                return storage.saveLayout(payload.obj, done);
            } else if (action === 'saveblock') {
                return storage.saveBlock(payload.obj, done);
            } else if (action === 'savemicrotemplate') {
                return storage.saveMicroTemplate(payload.obj, done);
            }
        }

        // Restricted to admin
        if (isAdmin) {
            if (action === 'saveconfig') {
                return storage.saveConfig(payload.obj, done);
            }
        }

        return done.error(new Error(`Not allowed: ${action}`));
    } else if (method === 'OPTIONS') {
        console.log("OPTIONS", "You should not pass OPTIONS calls to the lambda. Return a MOCK response in API-GW instead");
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