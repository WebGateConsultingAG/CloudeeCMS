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
 * File Version: 2023-05-22 12:19 - RSC
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();
const codepipeline = new AWS.CodePipeline();
const codebuild = new AWS.CodeBuild();
const fs = require('fs');
const admZIP = require('adm-zip');
const http = require('https');
const mime = require('mime');
const tableName = process.env.DB_TABLE;
const pipelineName = process.env.PIPELINE_NAME;
const pipelineBucket = process.env.PIPELINE_BUCKET;
const EXPECTED_BUILD_IMAGE = 'aws/codebuild/standard:6.0';

exports.handler = async function (event, context, callback) {
    const done = _done(callback);

    if (!tableName || tableName === '') {
        return done.done({ published: false, errorMessage: "DB_TABLE not configured in lambda function", log: [] });
    }

    const cognitoGroups = event.requestContext.authorizer.claims['cognito:groups'] || '';
    const userGroups = cognitoGroups.split(',');

    let isAdmin = userGroups.indexOf('CloudeeCMS-Admin') >= 0;

    let method = event.httpMethod;
    if (method === 'POST') {

        let payload = JSON.parse(event.body);
        let action = payload.action ? payload.action : '';
        if (isAdmin) {
            if (action === 'importPackage') {
                return importPackage(payload.targetenv, payload.s3key, done);
            } else if (action === 'createBackup') {
                return createBackup(payload.targetenv, done);
            } else if (action === 'startUpdate') {
                return startUpdate(payload, done);
            } else if (action === 'getpipelinestatus') {
                return getPipelineStatus(done);
            } else if (action === 'getbuildprojectinfo') {
                return done.done(await getBuildProjectInfo());
            }
        } else {
            return done.error(new Error(`Not allowed: ${action}`));
        }

        done.error(new Error(`Not implemented: ${action}`));
    } else {
        done.error(new Error("Only POST is supported"));
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
                var buf = new Buffer.alloc(bytes);
                var c = 0;

                for (var i = 0; i < bodyChunks.length; i++) {
                    bodyChunks[i].copy(buf, c, 0);
                    c += bodyChunks[i].length;
                }
                console.log("len", bytes);
                fs.writeFileSync(dest, buf, { flags: 'w', encoding: null, mode: 0o666 });
                resolve();
            });
        }).on('error', reject);
    });
};

function httpPOSTJSON(options, payload) {
    return new Promise((resolve, reject) => {
        const payloadBody = JSON.stringify(payload);
        options.headers = { 'Content-Type': 'application/json', 'Content-Length': payloadBody.length };
        const req = http.request(options, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('statusCode=' + res.statusCode));
            }
            var body = [];
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
        req.write(payloadBody);
        req.end();
    });
}
async function startUpdate(payload, done) {
    // This will download the source ZIP and put it in CodePipeline S3 bucket then start building

    console.log('Checking status of CodePipeline', pipelineName);
    let pStatus = await codepipeline.getPipelineState({ name: pipelineName }).promise();
    console.log('pStatus', JSON.stringify(pStatus));
    if (hasCodePipelineStatus(pStatus, 'InProgress')) {
        return done.done({ success: false, message: 'Update is already in progress', pStatus: pStatus });
    }
    // Get updater info
    const updOpts = {
        host: 'notifications.cloudee-cms.com',
        path: '/api/notifications',
        port: 443,
        method: 'POST'
    };
    const updPayload = { action: "checkforupdates", versioninfo: { version: payload.version }, repobranch: payload.repobranch };
    let updDLOpts = null;
    await httpPOSTJSON(updOpts, updPayload).then(
        (jsonData) => { updDLOpts = jsonData.data || {}; },
        (err) => {
            console.log(err);
            return done.done({ success: false, message: 'Failed to download update information', pStatus: pStatus || {} });
        }
    );

    if (updDLOpts === null || !updDLOpts.updateURL || updDLOpts.updateURL === '') {
        console.log('Something is wrong with updDLOpts', updDLOpts);
        return done.done({ success: false, message: 'Failed to process update information', pStatus: pStatus || {} });
    }

    const updateSourceFilename = '/tmp/update_' + guid() + '_src.zip';

    console.log('Downloading sourcecode ZIP', updDLOpts.updateURL);

    await httpDownload(updDLOpts.updateURL, updateSourceFilename).then(
        () => { console.log("downloaded to", updateSourceFilename); },
        (err) => { console.log(err); }
    );

    // Check if file exists
    if (!fs.existsSync(updateSourceFilename)) {
        return done.done({ success: false, message: 'Failed to download update', pStatus: pStatus || {} });
    }

    console.log(updateSourceFilename, fs.statSync(updateSourceFilename));

    // Note: If we switch to ZIP release downloads from github, we have to unpack,
    // then get rid of the root folder and pack everything again 

    // Upload to pipeline source bucket
    console.log('Uploading to S3', pipelineBucket);
    let fbuf = fs.readFileSync(updateSourceFilename);

    await s3.putObject({
        Bucket: pipelineBucket,
        Key: 'codepipeline/cloudeecms/deploy.zip',
        Body: fbuf,
        ContentType: 'application/zip'
    }).promise().then(
        (data) => { },
        (err) => {
            console.log(err);
            return done.done({ success: false, message: 'Failed to upload update to CodePipeline', pStatus: pStatus || {} });
        }
    );

    console.log('Start CodePipeline build', pipelineName);
    let pExec = await codepipeline.startPipelineExecution({ name: pipelineName }).promise();
    done.done({ success: true, message: 'Update started', pStatus: pStatus, pExec: pExec });
}
function hasCodePipelineStatus(pStatus, chkStatus) {
    try {
        for (let i = 0; i < pStatus.stageStates.length; i++) {
            if (pStatus.stageStates[i].latestExecution.status === chkStatus) return true;
        }
        return false;
    } catch (e) {
        console.log(e);
        return false;
    }
}
async function getPipelineStatus(done) {
    let pStatus = await codepipeline.getPipelineState({ name: pipelineName }).promise();
    return done.done({ success: true, running: hasCodePipelineStatus(pStatus, 'InProgress'), failed: hasCodePipelineStatus(pStatus, 'Failed'), pStatus: pStatus });
}
async function importPackage(s3BucketName, s3key, done) {
    let lstLog = [];
    try {
        let saveConfig = false;
        const config = await getConfig();
        if (!config) {
            lstLog.push('Configuration document missing');
            return done.done({ errorMessage: "Configuration document missing", log: lstLog });
        }

        let sessionID = guid();
        let sDir = "/tmp/" + sessionID + "/";

        lstLog.push("Download " + s3key + " from bucket " + s3BucketName);

        // create session folder
        fs.mkdirSync(sDir);
        fs.mkdirSync(sDir + 'unpack');

        const zipfile = sDir + 'package.zip';
        lstLog.push("Downloading to: " + zipfile);
        await downloadS3({ Bucket: s3BucketName, Key: s3key }, zipfile);

        lstLog.push('Decompressing: ' + zipfile);
        const xDir = sDir + 'unpack/';

        var zip = new admZIP(zipfile);
        zip.extractAllTo(xDir, true);

        const pkg = getPackageInfo(sDir + 'unpack/package.json');

        if (pkg === null) {
            lstLog.push('Error: Not a valid CloudeeCMS-Package');
            return done.done({ errorMessage: 'Not a valid CloudeeCMS-Package', log: lstLog });
        }
        lstLog.push('Importing Package: ' + pkg.title);

        // Upload resources to CDN bucket
        if (pkg.resources && pkg.resources.filesCDN) {
            const cdnBucket = getBucketByName('CDN', config.buckets);
            const s3BucketName = cdnBucket ? cdnBucket.bucketname : '';
            if (s3BucketName === '') {
                lstLog.push("CDN Bucket config not found");
                return done.done({ errorMessage: "CDN Bucket config not found", log: lstLog });
            } else {
                lstLog.push("Importing CDN resources to " + s3BucketName);
                let lstFiles = [];
                getFileStructure(sDir + 'unpack/' + pkg.resources.filesCDN, '', lstFiles);
                console.log('CDN Files', lstFiles);

                for (let f = 0; f < lstFiles.length; f++) {
                    let fKey = lstFiles[f];
                    let thisFile = sDir + 'unpack/' + pkg.resources.filesCDN + '/' + fKey;
                    let fbuf = fs.readFileSync(thisFile);
                    await s3.putObject({
                        Bucket: s3BucketName,
                        Key: fKey,
                        Body: fbuf,
                        ACL: 'public-read',
                        ContentType: mime.getType(thisFile)
                    }).promise();
                }
            }
        }

        // Add global variables to config document
        if (pkg.resources && pkg.resources.variables) {
            lstLog.push("Importing global variables");
            if (!config.variables) config.variables = [];
            pkg.resources.variables.forEach(vEntry => {
                console.log("Set variable", vEntry.variablename, vEntry.value);
                setVariable(config.variables, vEntry, false);
            });
            saveConfig = true;
        }

        // Import global Pug script functions
        if (pkg.resources && pkg.resources.globalfunctions && pkg.resources.globalfunctions !== '') {
            lstLog.push("Importing global functions");
            if (!config.pugGlobalScripts) config.pugGlobalScripts = [];
            try {
                var lstFn = JSON.parse(fs.readFileSync(xDir + pkg.resources.globalfunctions));
                lstFn.forEach(fn => {
                    lstLog.push("Function: " + fn.fName);
                    setGlobalFunction(config.pugGlobalScripts, fn, false);
                });
            } catch (e) {
                lstLog.push("Error while importing global functions!");
            }
            saveConfig = true;
        }

        // Import DynamoDB database entries
        if (pkg.resources && pkg.resources.database && pkg.resources.database !== '') {
            lstLog.push("Importing database entries");
            const dbimportpath = pkg.resources.database + '/';
            let pc = 0;
            fs.readdirSync(xDir + dbimportpath)
                .filter(file => (file.indexOf('.') !== 0) && (file.slice(-5) === '.json'))
                .forEach((file) => {
                    var fi = fs.readFileSync(xDir + dbimportpath + file);
                    var obj = JSON.parse(fi);
                    if (obj.id && obj.id !== 'config') {
                        pc++;
                        documentClient.put({ TableName: tableName, Item: obj }).promise();
                    }
                });
            lstLog.push("Imported " + pc + " entries to database table " + tableName);
        }

        // Import feeds
        if (pkg.resources && pkg.resources.feeds && pkg.resources.feeds.length > 0) {
            lstLog.push("Importing feeds");
            if (!config.feeds) config.feeds = [];
            try {
                pkg.resources.feeds.forEach(fd => {
                    var fExists = false;
                    for (var i = 0; i < config.feeds.length; i++) {
                        if (config.feeds[i].id && config.feeds[i].id === fd.id) { fExists = true; }
                    }
                    if (fExists === false) {
                        lstLog.push("Feed: " + fd.title);
                        config.feeds.push(fd);
                        saveConfig = true;
                    }
                });
            } catch (e) {
                lstLog.push("Error while importing feeds!");
            }
        }

        // Import page categories
        if (pkg.resources && pkg.resources.pagecategories && pkg.resources.pagecategories.length > 0) {
            lstLog.push("Importing page categories");
            if (!config.categories) config.categories = [];
            try {
                pkg.resources.pagecategories.forEach(category => {
                    if (config.categories.indexOf(category) < 0) {
                        lstLog.push("Add page category: " + category);
                        config.categories.push(category);
                        saveConfig = true;
                    }
                });
            } catch (e) {
                lstLog.push("Error while importing page categories!");
            }
            saveConfig = true;
        }

        // Check if force enablenavtree is set
        if (pkg.resources && pkg.resources.enablenavtree === true) {
            lstLog.push("Enable navtree rendering");
            config.enablenavtree = true;
            saveConfig = true;
        }

        // Save configuration document when done
        if (saveConfig === true) {
            lstLog.push("Saving configuration");
            await documentClient.put({ TableName: tableName, Item: config }).promise();
        }

        // Import image upload and resize profiles
        if (pkg.resources && pkg.resources.imageprofiles) {
            lstLog.push("Importing imageprofiles");
            try {
                // Get existing imageprofiles from database
                const imgp = await getImageProfiles();

                pkg.resources.imageprofiles.forEach(vEntry => {
                    console.log("Add profile", vEntry.label, vEntry.id);
                    let added = false;
                    for (let i = 0; i < imgp.lstProfiles.length; i++) {
                        if (imgp.lstProfiles[i].id === vEntry.id) {
                            imgp.lstProfiles[i] = vEntry; // update existing
                            added = true;
                        }
                    }
                    if (!added) imgp.lstProfiles.push(vEntry); // add new
                });
                lstLog.push("Saving imageprofiles");
                await documentClient.put({ TableName: tableName, Item: imgp }).promise();
            } catch (e) {
                lstLog.push("Error while importing imageprofiles!");
            }
        }

        done.done({ success: true, log: lstLog });

    } catch (e) {
        console.error(e);
        lstLog.push(e.toString());
        done.done({ errorMessage: e.toString(), log: lstLog });
    }
}

async function createBackup(s3BucketName, done) {
    let lstLog = [];
    try {
        const config = await getConfig();
        if (!config) {
            lstLog.push('Configuration document missing');
            return done.done({ errorMessage: "Configuration document missing", log: lstLog });
        }

        let sessionID = guid();
        let sDir = "/tmp/" + sessionID + "/";
        let thisDate = getDateString();
        let compressedFilePath = 'backup_' + thisDate + '_' + sessionID + '.zip';
        let s3key = 'backup/' + compressedFilePath;

        lstLog.push("Export table " + tableName + " to " + sDir);

        // create session folder
        fs.mkdirSync(sDir);
        fs.mkdirSync(sDir + 'db/');

        let lstEntries = await DDBScan({ TableName: tableName });
        lstEntries.forEach(entry => {
            if (entry.id !== 'config') fs.writeFileSync(sDir + 'db/' + entry.id + '.json', JSON.stringify(entry), {});
        });

        let pkgInfo = {
            "type": "CloudeeCMS-Package",
            "title": "CloudeeCMS - Backup",
            "description": "Database backup " + thisDate,
            "categories": ["Backup"],
            "packageformat": "1.0",
            "resources": { "database": "db" }
        };

        // Export Pug global script functions
        if (config.variables && config.variables.length > 0) {
            lstLog.push("Exporting global variables");
            pkgInfo.resources.variables = config.variables;
        }

        // Export global variables
        if (config.pugGlobalScripts && config.pugGlobalScripts.length > 0) {
            lstLog.push("Exporting global functions");
            try {
                pkgInfo.resources.globalfunctions = "globalFunctions.json";
                fs.writeFileSync(sDir + '/' + pkgInfo.resources.globalfunctions, JSON.stringify(config.pugGlobalScripts));
            } catch (e) {
                lstLog.push("Error while exporting global functions!");
            }
        }

        lstLog.push('Creating package.json');
        fs.writeFileSync(sDir + '/package.json', JSON.stringify(pkgInfo));

        lstLog.push('Compressing: ' + sDir + compressedFilePath);
        let zip = new admZIP();
        //zip.addLocalFolder(sDir + 'db/');
        zip.addLocalFolder(sDir);
        zip.writeZip(sDir + compressedFilePath);

        lstLog.push('Uploading zip file to S3');
        let fbuf = fs.readFileSync(sDir + compressedFilePath);

        await s3.putObject({
            Bucket: s3BucketName,
            Key: s3key,
            Body: fbuf,
            ACL: 'public-read', ContentType: "application/zip"
        }).promise();

        lstLog.push('Uploaded to S3 Bucket: ' + s3BucketName + '/' + s3key);
        done.done({ success: true, filename: s3key, log: lstLog });

    } catch (e) {
        console.error(e);
        lstLog.push(e.toString());
        done.done({ errorMessage: e.toString(), log: lstLog });
    }
}

function setVariable(lst, vEntry, force) {
    // Do not overwrite variables unless 'force is true'
    for (let i = 0; i < lst.length; i++) {
        if (lst[i].variablename === vEntry.variablename) {
            if (!force) return; // do not overwrite existing variables
            lst[i].value = vEntry.value;
            return;
        }
    }
    lst.push(vEntry);
}
function setGlobalFunction(lst, vEntry, force) {
    // Do not overwrite functions unless 'force is true'
    for (let i = 0; i < lst.length; i++) {
        if (lst[i].fName === vEntry.fName) {
            if (!force) return; // do not overwrite existing function
            lst[i].body = vEntry.body;
            return;
        }
    }
    lst.push(vEntry);
}
function getBucketByName(nm, lstBuckets) {
    for (let i = 0; i < lstBuckets.length; i++) {
        if (lstBuckets[i].label === nm) return lstBuckets[i];
    }
    return null;
}
async function getConfig() {
    let doc = await documentClient.get({ TableName: tableName, Key: { id: "config" } }).promise();
    if (doc && doc.Item) {
        return doc.Item;
    } else {
        console.log(tableName, 'config not found');
        return null;
    }
}
async function getImageProfiles() {
    let doc = await documentClient.get({ TableName: tableName, Key: { id: "imageprofiles" } }).promise();
    if (doc && doc.Item) {
        return doc.Item;
    } else { // return a new empty profile
        return { "id": "imageprofiles", "lstProfiles": [] };
    }
}
function getFileStructure(rootPath, thisPath, lst) {
    fs.readdirSync(rootPath + thisPath, { withFileTypes: true })
        .forEach((file) => {
            if (file.isDirectory()) {
                getFileStructure(rootPath, thisPath + '/' + file.name, lst);
            } else {
                let fKey = thisPath + '/' + file.name;
                lst.push(fKey.substr(1, fKey.length));
            }
        });
}
function downloadS3(s3params, destFile) {
    console.log("downloadS3", s3params);
    return new Promise((resolve, reject) => {
        s3.getObject(s3params)
            .createReadStream()
            .pipe(fs.createWriteStream(destFile))
            .on('close', () => {
                resolve(destFile);
            })
            .on('error', (ee) => { console.warn(ee) });
    });
}

async function DDBScan(params) {
    // this will scan beyond 1MB limit
    let lstRC = [];
    let hasMore = true;
    while (hasMore) {
        let data = await documentClient.scan(params).promise();
        data.Items.forEach(function (itemdata) {
            lstRC.push(itemdata);
        });
        if (typeof data.LastEvaluatedKey != "undefined") {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
        } else {
            hasMore = false;
        }
    }
    return lstRC;
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

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4();
}
function getDateString(dt) {
    if (!dt || typeof dt === 'undefined') dt = new Date();
    let m = dt.getMonth() + 1;
    let d = dt.getDate();
    return dt.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
}

function getPackageInfo(pkgPath) {
    const pkginfo = require(pkgPath);
    return pkginfo.type === 'CloudeeCMS-Package' ? pkginfo : null;
}
async function getBuildProjectInfo() {
    try {
        const p = pipelineName.lastIndexOf("-pipeline");
        if (p < 1) return { success: false, message: 'Unable to extract project name' };
        const projectname = pipelineName.substring(0, p);
        const params = { names: [] };
        params.names.push(projectname + '-buildproject-frontend');
        params.names.push(projectname + '-buildproject-backend');
        const cbp = await codebuild.batchGetProjects(params).promise();
        const buildprojects = [];
        let hasWarning = false;
        cbp.projects.forEach(bp => {
            let isOK = (EXPECTED_BUILD_IMAGE !== (bp.environment.image || ''));
            if (!isOK) hasWarning = true;
            buildprojects.push({
                name: bp.name || '-untitled',
                image: bp.environment.image || '-unknown-',
                computeType: bp.environment.computeType || '-unknown-',
                isOK
            });
        });
        return { success: true, buildinfo: { buildprojects, hasWarning, EXPECTED_BUILD_IMAGE } };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error while processing' };
    }
}