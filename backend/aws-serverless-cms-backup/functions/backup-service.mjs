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
 * File Version: 2023-06-06 07:10 - RSC
 */

import { documentClient, DDBGet, DDBScan, getNewGUID, getFormattedDate } from './lambda-utils.mjs';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import { createWriteStream } from "node:fs";
import admZIP from 'adm-zip';
import mime from 'mime';
const tableName = process.env.DB_TABLE;
const s3client = new S3Client();
const GSI1_NAME = 'GSI1-index';
const backupSVC = {};

backupSVC.createBackup = async function (s3BucketName) {
    let lstLog = [];
    try {
        const config = await DDBGet({ TableName: tableName, Key: { id: "config" } });
        if (!config) {
            lstLog.push('Configuration document missing');
            return { success: false, message: "Configuration document missing", log: lstLog };
        }
        const sessionID = getNewGUID();
        const sDir = "/tmp/" + sessionID + "/";
        const thisDate = getFormattedDate(new Date());
        const compressedFilePath = 'backup_' + thisDate + '_' + sessionID + '.zip';
        const s3key = 'backup/' + compressedFilePath;
        lstLog.push("Export table " + tableName + " to " + sDir);

        // create session folder
        fs.mkdirSync(sDir);
        fs.mkdirSync(sDir + 'db/');

        let lstEntries = await DDBScan({ TableName: tableName });
        lstEntries.forEach(entry => {
            if (entry.id !== 'config') fs.writeFileSync(sDir + 'db/' + entry.id + '.json', JSON.stringify(entry), {});
        });

        let pkgInfo = {
            type: "CloudeeCMS-Package",
            title: "CloudeeCMS - Backup",
            description: "Database backup " + thisDate,
            categories: ["Backup"],
            packageformat: "1.0",
            resources: { "database": "db" }
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
        const zip = new admZIP();
        zip.addLocalFolder(sDir);
        zip.writeZip(sDir + compressedFilePath);
        lstLog.push('Uploading zip file to S3');
        let fbuf = fs.readFileSync(sDir + compressedFilePath);

        const params = {
            Bucket: s3BucketName, Key: s3key, Body: fbuf,
            ACL: 'public-read', ContentType: 'application/zip'
        };
        const command = new PutObjectCommand(params);
        await s3client.send(command);
        lstLog.push('Uploaded to S3 Bucket: ' + s3BucketName + '/' + s3key);
        return { success: true, filename: s3key, log: lstLog };
    } catch (e) {
        console.log(e);
        lstLog.push(e.message || 'Error');
        return { success: false, message: e.message || 'Error', log: lstLog };
    }
};

backupSVC.importPackage = async function (s3BucketName, s3key) {
    let lstLog = [];
    try {
        let saveConfig = false;
        const config = await DDBGet({ TableName: tableName, Key: { id: "config" } });
        if (!config) {
            lstLog.push('Configuration document missing');
            return { success: false, message: "Configuration document missing", log: lstLog };
        }

        const sessionID = getNewGUID();
        const sDir = "/tmp/" + sessionID + "/";

        // create session folder
        fs.mkdirSync(sDir);
        fs.mkdirSync(sDir + 'unpack');

        const zipfile = sDir + 'package.zip';
        lstLog.push("Downloading " + s3key + " from bucket " + s3BucketName + " to " + zipfile);
        let s3rc = await downloadS3({ Bucket: s3BucketName, Key: s3key }, zipfile);
        if (!s3rc) return { success: false, message: 'Failed to download package from S3', log: lstLog };
        lstLog.push('Decompressing: ' + zipfile);
        const xDir = sDir + 'unpack/';
        const zip = new admZIP(zipfile);
        zip.extractAllTo(xDir, true);
        const pkg = getPackageInfo(sDir + 'unpack/package.json');

        if (pkg === null) {
            lstLog.push('Error: Not a valid CloudeeCMS-Package');
            return { success: false, message: 'Not a valid CloudeeCMS-Package', log: lstLog };
        }
        lstLog.push('Importing Package: ' + pkg.title);

        // Upload resources to CDN bucket
        if (pkg.resources && pkg.resources.filesCDN) {
            const cdnBucket = getBucketByName('CDN', config.buckets);
            const s3BucketName = cdnBucket ? cdnBucket.bucketname : '';
            if (s3BucketName === '') {
                lstLog.push("CDN Bucket config not found");
                return { success: false, message: "CDN Bucket config not found", log: lstLog };
            } else {
                lstLog.push("Importing CDN resources to " + s3BucketName);
                let lstFiles = [];
                getFileStructure(sDir + 'unpack/' + pkg.resources.filesCDN, '', lstFiles);
                console.log('CDN Files', lstFiles);
                for (let f = 0; f < lstFiles.length; f++) {
                    let fKey = lstFiles[f];
                    let thisFile = sDir + 'unpack/' + pkg.resources.filesCDN + '/' + fKey;
                    let fbuf = fs.readFileSync(thisFile);
                    let s3command = new PutObjectCommand({
                        Bucket: s3BucketName, Key: fKey, Body: fbuf,
                        ACL: 'public-read', ContentType: mime.getType(thisFile)
                    });
                    await s3client.send(s3command);
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
                let lstFn = JSON.parse(fs.readFileSync(xDir + pkg.resources.globalfunctions));
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
                .forEach(async (file) => {
                    var fi = fs.readFileSync(xDir + dbimportpath + file);
                    var obj = JSON.parse(fi);
                    if (obj.id && obj.id !== 'config') {
                        pc++;
                        await documentClient.put({ TableName: tableName, Item: obj });
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
                    let fExists = false;
                    for (let i = 0; i < config.feeds.length; i++) {
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
            await documentClient.put({ TableName: tableName, Item: config });
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
                await documentClient.put({ TableName: tableName, Item: imgp });
            } catch (e) {
                lstLog.push("Error while importing imageprofiles!");
            }
        }

        return { success: true, log: lstLog };
    } catch (e) {
        console.log(e);
        lstLog.push(e.message || 'Error');
        return { success: false, message: e.message || 'Error', log: lstLog };
    }
};
async function downloadS3(s3params, destFile) {
    try {
        const command = new GetObjectCommand(s3params);
        const data = await s3client.send(command);
        data.Body.pipe(createWriteStream(destFile));
        /*
        import { Readable } from 'stream';
        const readStream = item.Body as Readable
        */
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}
function getBucketByName(nm, lstBuckets) {
    try {
        for (let i = 0; i < lstBuckets.length; i++) if (lstBuckets[i].label === nm) return lstBuckets[i];
        return null;
    } catch (e) {
        console.log(e);
        return null;
    }
}
function getPackageInfo(pkgPath) {
    try {
        let fbuf = fs.readFileSync(pkgPath);
        const pkginfo = JSON.parse(fbuf);
        return pkginfo.type === 'CloudeeCMS-Package' ? pkginfo : null;
    } catch (e) {
        console.log(e);
        return null;
    }
}
function getFileStructure(rootPath, thisPath, lst) {
    fs.readdirSync(rootPath + thisPath, { withFileTypes: true })
        .forEach((file) => {
            if (file.isDirectory()) {
                getFileStructure(rootPath, thisPath + '/' + file.name, lst);
            } else {
                let fKey = thisPath + '/' + file.name;
                lst.push(fKey.substring(1, fKey.length));
            }
        });
}
function setGlobalFunction(lst, vEntry, force) {
    try {
        // Do not overwrite functions unless 'force is true'
        for (let i = 0; i < lst.length; i++) {
            if (lst[i].fName === vEntry.fName) {
                if (!force) return; // do not overwrite existing function
                lst[i].body = vEntry.body;
                return;
            }
        }
        lst.push(vEntry);
    } catch (e) {
        console.log(e);
    }
}
function setVariable(lst, vEntry, force) {
    try {
        // Do not overwrite variables unless 'force is true'
        for (let i = 0; i < lst.length; i++) {
            if (lst[i].variablename === vEntry.variablename) {
                if (!force) return; // do not overwrite existing variables
                lst[i].value = vEntry.value;
                return;
            }
        }
        lst.push(vEntry);
    } catch (e) {
        console.log(e);
    }
}
async function getImageProfiles() {
    try {
        let doc = await DDBGet({ TableName: tableName, Key: { id: "imageprofiles" } });
        if (doc) {
            return doc;
        } else { // return a new empty profile
            return { id: "imageprofiles", lstProfiles: [] };
        }
    } catch (e) {
        console.log(e);
        return { id: "imageprofiles", lstProfiles: [] };
    }
}

export { backupSVC };
