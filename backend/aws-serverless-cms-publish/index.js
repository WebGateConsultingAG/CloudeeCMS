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
 * File Version: 2020-10-22 14:20 - RSC
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();
const pug = require('pug');
const fs = require('fs');
const AWSSQS = require('aws-sdk/clients/sqs');
const sqs = new AWSSQS();
const { SitemapStream, streamToPromise } = require('sitemap');
const Feed = require('feed').Feed;

const tableName = process.env.DB_TABLE;

let MTTemplates = {};

exports.handler = async function (event, context, callback) {
    const done = _done(callback);

    if (!tableName || tableName === '') {
        return done.done({ published: false, errorMessage: "DB_TABLE not configured in lambda function", log: [] });
    }

    let method = event.httpMethod;
    if (method === 'POST') {

        let configdoc = await documentClient.get({ TableName: tableName, Key: { id: "config" } }).promise();
        if (!configdoc || !configdoc.Item) return done.done({ published: false, errorMessage: "Configuration document not found", log: [] });
        let cfg = configdoc.Item;

        let payload = JSON.parse(event.body);
        let action = payload.action ? payload.action : '';

        if (action === 'publishpage') {
            return publishPage(payload.targetenv, payload.id, payload.page, cfg, done);
        } else if (action === 'bulkpublishpage') {
            return bulkPublishPage(payload.targetenv, payload.lstPageIDs, payload.pubtype, payload.removeFromQueue, cfg, done);
        } else if (action === 'unpublishpage') {
            return unpublishPage(payload.targetenv, payload.id, payload.opath, cfg, done);
        } else if (action === 'publishfeeds') {
            return publishFeeds(payload.targetenv, payload.lstFeeds, cfg, done);
        }

        done.error(new Error("No Handle for action: " + action));
    } else {
        done.error(new Error("Only POST is supported"));
    }
};

async function getConfigVariables(cfg) {
    // Returns variables to append to renderer object
    const vars = {};
    vars.navtree = [];

    if (cfg.cfdists) {
        cfg.cfdists.forEach(cfdist => {
            if (cfdist.webURLVAR && cfdist.webURLVAR !== '') {
                vars[cfdist.webURLVAR] = cfdist.webURL;
            }
        });
    }
    if (cfg.variables) {
        cfg.variables.forEach(variable => {
            vars[variable.variablename] = variable.value;
        });
    }
    if (cfg.enablenavtree === true) {
        let params = {
            TableName: tableName,
            FilterExpression: 'otype = :fld AND listnav = :lnav',
            ExpressionAttributeValues: { ':fld': 'Page', ':lnav': true },
            ProjectionExpression: 'id, opath, title, navlabel, navsort, dt, descr'
        };

        let lst = await DDBScan(params);
        vars.navtree = flxTree.makeTree(lst);
    }
    return vars;
}

async function unpublishPage(s3BucketName, id, opath, cfg, done) {
    let lstLog = [];
    try {
        if (s3BucketName === '') return done.done({ published: false, errorMessage: "S3 Bucket name not supplied", log: lstLog });

        lstLog.push("Unpublishing page " + id + " on " + s3BucketName);

        // remove from S3
        lstLog.push("Remove from S3 (" + s3BucketName + "): " + opath);
        s3remove(s3BucketName, opath);

        // remove document from search index
        let indexConfig = getIndexerConfig(cfg, s3BucketName);
        if (indexConfig !== null) {
            lstLog.push("Remove from search index: " + indexConfig.ftindex);
            let indexerMsg = { "action": "remove", "tableName": tableName, "bucketName": s3BucketName, "indexName": indexConfig.ftindex, "ids": [id] };
            await sendSQS(indexerMsg, indexConfig.ftindexSQS);
        }

        done.done({ unpublished: true, log: lstLog });
    } catch (e) {
        console.log(e);
        done.done({ unpublished: false, errorMessage: e.toString(), log: lstLog });
    }
}


async function publishPage(s3BucketName, id, page, cfg, done) {
    // pass either a page object or ID. if page is null, page will be fetched from db
    let lstLog = [];
    try {

        if (s3BucketName === '') return done.done({ published: false, errorMessage: "S3 Bucket name not supplied", log: lstLog });

        let sessionID = guid();
        let sDir = "/tmp/" + sessionID + "/";

        lstLog.push("Publishing page " + id + " on " + s3BucketName + " SessionID: " + sessionID);

        // create session folder
        fs.mkdirSync(sDir);

        // Get page fields from dynamoDB
        if (!page) { // get page by ID from database
            let doc = await documentClient.get({ TableName: tableName, Key: { id: id } }).promise();
            page = doc.Item;
        }

        if (typeof page.doc === 'undefined') page.doc = {}; // this will hold customField values
        page.publishDT = new Date().toISOString();
        if (!page.updateDT) page.updateDT = new Date().toISOString();

        // Add config variables to page object
        page.env = await getConfigVariables(cfg);

        var layoutKey = "default";
        var layoutID = "";
        if (page.layout) layoutID = page.layout;

        // Get global Pug scripts prefix
        let globalScripts = getGlobalScripts(cfg);

        // Get all layouts and blocks, and save as pug files in session folder
        let params = {
            TableName: tableName,
            FilterExpression: 'ptype = :fld',
            ExpressionAttributeValues: { ':fld': 'pugfile' },
            ProjectionExpression: 'id, body, okey, custFields'
        };

        var thisLayout = null;
        var lstLayouts = await DDBScan(params);
        lstLayouts.forEach(layout => {
            lstLog.push("Downloaded layout:" + sDir + layout.okey + '.pug');
            fs.writeFileSync(sDir + layout.okey + '.pug', globalScripts + layout.body, {});
            if (layout.id === layoutID) {
                layoutKey = layout.okey;
                thisLayout = layout;
            }
        });

        // Convert JSON dropdown fields (defined in layout)
        convertJSONFields(page, thisLayout);

        // Render microtemplates
        await loadMicroTemplates(globalScripts);
        renderMicroTemplates(page);

        lstLog.push("Rendering page " + page.id + " with layout " + layoutKey);
        const pageRenderer = pug.compileFile(sDir + layoutKey + ".pug", { basedir: sDir });
        var html = pageRenderer(page);

        // upload to S3
        lstLog.push("Upload to S3 (" + s3BucketName + "): " + page.opath);
        s3upload(s3BucketName, page.opath, addBranding(html));

        if (page.ftindex) { // add document to search index
            let indexConfig = getIndexerConfig(cfg, s3BucketName);
            if (indexConfig !== null) {
                lstLog.push("Add to search index: " + indexConfig.ftindex);
                let indexerMsg = { "action": "add", "tableName": tableName, "bucketName": s3BucketName, "indexName": indexConfig.ftindex, "ids": [page.id] };
                await sendSQS(indexerMsg, indexConfig.ftindexSQS);
            }
        }

        // Upload navtree as JSON to S3
        if (cfg.enablenavtree === true) {
            lstLog.push("Uploading navtree.json");
            uploadNavTree(s3BucketName, page.env.navtree);
        }

        done.done({ published: true, log: lstLog });
    } catch (e) {
        console.log(e);
        done.done({ published: false, errorMessage: e.toString(), log: lstLog });
    }
}
function convertJSONFields(page, thisLayout) {
    try {
        if (thisLayout && thisLayout.custFields) {
            thisLayout.custFields.forEach(fld => {
                if (fld.fldValueType === 'JSON') {
                    let docfld = page.doc[fld.fldName];
                    try {
                        if (docfld) { page.doc[fld.fldName] = JSON.parse(docfld); }
                    } catch (e) {
                        console.log(e);
                    }
                }
            });
        }
    } catch (e) {
        console.log(e);
    }
}
async function bulkPublishPage(s3BucketName, lstPageIDs, pubtype, removeFromQueue, cfg, done) {
    let lstLog = [];
    try {

        if (s3BucketName === '') return done.done({ published: false, errorMessage: "S3 Bucket name not supplied ", log: lstLog });

        let sessionID = guid();
        let sDir = "/tmp/" + sessionID + "/";

        lstLog.push("BulkPublish on " + s3BucketName + " for " + pubtype + " SessionID: " + sessionID);

        let indexConfig = getIndexerConfig(cfg, s3BucketName);

        // create session folder
        fs.mkdirSync(sDir);

        // Get global Pug scripts prefix
        let globalScripts = getGlobalScripts(cfg);

        // prepare microtemplates
        await loadMicroTemplates(globalScripts);

        // Get all layouts and blocks, and save as pug files in session folder
        let params = {
            TableName: tableName,
            FilterExpression: 'ptype = :fld',
            ExpressionAttributeValues: { ':fld': 'pugfile' },
            ProjectionExpression: 'id, body, okey, custFields'
        };

        let lstLayouts = await DDBScan(params);
        lstLayouts.forEach(layout => {
            lstLog.push("Downloaded layout:" + sDir + layout.okey + '.pug');
            fs.writeFileSync(sDir + layout.okey + '.pug', globalScripts + layout.body, {});
        });

        // get pages to publish
        let pgParams;
        let lstPages;
        if (pubtype === "all") {
            pgParams = {
                TableName: tableName,
                FilterExpression: 'otype = :fld',
                ExpressionAttributeValues: { ':fld': 'Page' },
            };
            lstPages = await DDBScan(pgParams);
        } else if (pubtype === "selected") {
            pgParams = { "RequestItems": {} };
            pgParams.RequestItems[tableName] = {};
            pgParams.RequestItems[tableName].Keys = lstPageIDs.map(thisID => { return { "id": thisID } });
            lstPages = await DDBBatchGet(pgParams);
        }
        const pageEnv = await getConfigVariables(cfg);

        lstPages.forEach(async page => {
            if (typeof page.doc === 'undefined') page.doc = {}; // this will hold customField values
            page.publishDT = new Date().toISOString();
            if (!page.updateDT) page.updateDT = new Date().toISOString();

            // Add config variables to page object
            page.env = pageEnv;

            var layoutID = "";
            if (page.layout) layoutID = page.layout;
            var thisLayout = getLayoutByID(lstLayouts, layoutID);
            var layoutKey = thisLayout.okey || "default";

            // Convert JSON dropdown fields (defined in layout)
            convertJSONFields(page, thisLayout);

            // Render microtemplates
            renderMicroTemplates(page);

            lstLog.push("Rendering page " + page.id + " with layout " + layoutKey);
            const pageRenderer = pug.compileFile(sDir + layoutKey + ".pug", { basedir: sDir });
            var html = pageRenderer(page);

            // upload to S3
            lstLog.push("Upload to S3 (" + s3BucketName + "): " + page.opath);
            s3upload(s3BucketName, page.opath, addBranding(html));

            // remove page from publishing queue
            if (removeFromQueue && pubtype === 'selected') {
                if (page.queue) removePageFromQueue(page.id);
            }

            if (page.ftindex) { // add document to search index
                if (indexConfig !== null) {
                    lstLog.push("Add to search index: " + indexConfig.ftindex);
                    let indexerMsg = { "action": "add", "tableName": tableName, "bucketName": s3BucketName, "indexName": indexConfig.ftindex, "ids": [page.id] };
                    await sendSQS(indexerMsg, indexConfig.ftindexSQS);
                }
            }

        });

        // Upload navtree as JSON to S3
        if (cfg.enablenavtree === true) {
            lstLog.push("Uploading navtree.json");
            uploadNavTree(s3BucketName, pageEnv.navtree);
        }

        done.done({ published: true, log: lstLog });
    } catch (e) {
        console.log(e);
        done.done({ published: false, errorMessage: e.toString(), log: lstLog });
    }
}

async function publishFeeds(s3BucketName, lstFeeds, cfg, done) {
    let lstLog = [];
    try {
        if (s3BucketName === '') return done.done({ published: false, errorMessage: "S3 Bucket name not supplied ", log: lstLog });
        let isOK = true;
        for (let i=0; i<lstFeeds.length; i++) {
            let feed = lstFeeds[i];
            lstLog.push("Processing feed: " + feed.filename + ' (' + feed.ftype + ')');
            let feedData = await getFeedContents(feed, cfg);
            if (feedData.hasError) {
                lstLog.push("Error in feed '" + feed.filename + "': " + feedData.errormsg);
                isOK = false;
            } else {
                lstLog.push("Uploading feed: " + feed.filename);
                s3upload(s3BucketName, feed.filename, feedData.body, feedData.contentType);
            }
        }
        
        lstLog.push("Uploading feeds completed");
        done.done({ published: isOK, log: lstLog });
    } catch (e) {
        console.log(e);
        done.done({ published: false, errorMessage: e.toString(), log: lstLog });
    }
}
async function getFeedContents(feed, cfg) {
    let rc = { body: '{}', contentType: 'application/json', hasError: false, errormsg: '' };
    try {
        const sitename = feed.sitename || 'https://mydomain';

        if (feed.ftype === 'Atom') {
            rc.contentType = 'application/atom+xml';

            // Get CDN link for page cover images
            const cdnBucket = getBucketByName('CDN', cfg.buckets);
            const cdnWebURL = cdnBucket?(cdnBucket.cdnURL || ''):'';

            const atomfeed = new Feed({
                title: feed.title,
                description: feed.description,
                id: sitename,
                link: sitename,
                image: feed.image,
                favicon: feed.favicon || '',
                copyright: feed.copyright || '',
                generator: "CloudeeCMS",
                feedLinks: {
                    atom: sitename + '/' + feed.filename
                }
            });

            let params = {
                TableName: tableName,
                FilterExpression: "otype = :ot AND contains(#fldC, :v1)",
                ExpressionAttributeNames: { "#fldC": "categories" },
                ExpressionAttributeValues: { ":v1": feed.category, ":ot": "Page" },
                ProjectionExpression: 'categories, opath, title, descr, dt, img'
            };

            let lstPages = await DDBScan(params);
            lstPages.sort(function (a, b) {
                return new Date(b.dt) - new Date(a.dt);
            });
            lstPages.forEach(pg => {
                let imgURL = null;
                if (pg.img && pg.img !== '') { imgURL = cdnWebURL + pg.img; } // Add CDN link for cover image
                atomfeed.addItem({
                    title: pg.title,
                    id: sitename + "/" + pg.opath,
                    link: sitename + "/" + pg.opath,
                    description: pg.descr || '',
                    date: new Date(pg.dt),
                    image: imgURL
                });
            });
            rc.body = atomfeed.rss2();

        } else if (feed.ftype === 'Sitemap') {
            rc.contentType = 'text/xml';

            const sitemap = new SitemapStream({ hostname: sitename || '' });
            let params = {
                TableName: tableName,
                FilterExpression: 'otype = :fld AND sitemap = :fsm',
                ExpressionAttributeValues: { ':fld': 'Page', ':fsm': true },
                ProjectionExpression: 'opath, pubdate'
            };

            let lstPages = await DDBScan(params);
            lstPages.forEach(pg => {
                if (pg.opath !== "index.html") sitemap.write({ url: '/' + pg.opath, changefreq: 'weekly' });
            });
            sitemap.end();
            let sm = await streamToPromise(sitemap);
            rc.body = sm.toString();

        } else { // JSON
            let params = {
                TableName: tableName,
                FilterExpression: "otype = :ot AND contains(#fldC, :v1)",
                ExpressionAttributeNames: { "#fldC": "categories" },
                ExpressionAttributeValues: { ":v1": feed.category, ":ot": "Page" },
                ProjectionExpression: 'categories, opath, title, descr, dt, pubdate, img'
            };
            let lstPages = await DDBScan(params);
            lstPages.sort(function (a, b) {
                return new Date(b.dt || b.pubdate) - new Date(a.dt || a.pubdate);
            });
            rc.body = JSON.stringify({ categories: feed.category, ftype: feed.ftype, lst: lstPages });
        }
        
        return rc;

    } catch (e) {
        console.log(e);
        rc.hasError = true;
        rc.errormsg = e.toString();
        return rc;
    }
}

function getGlobalScripts(cfg) {
    try {
        var rc = '';
        if (!cfg.pugGlobalScripts) return rc;
        cfg.pugGlobalScripts.forEach(fn => {
            rc += fn.body + '\n';
        });
        return rc;
    } catch (e) {
        console.log(e);
        return rc;
    }
}
function getIndexerConfig(cfg, s3BucketName) {
    try {
        let rc = null;
        if (cfg.buckets) {
            for (let i = 0; i < cfg.buckets.length; i++) {
                if (cfg.buckets[i].bucketname === s3BucketName) {
                    if (cfg.buckets[i].ftindex && cfg.buckets[i].ftindex !== "") {
                        return { "ftindex": cfg.buckets[i].ftindex, "ftindexSQS": cfg.buckets[i].ftindexSQS };
                    } else {
                        return null;
                    }
                }
            }
        }
        return rc;
    } catch (e) {
        console.log(e);
        return null;
    }
}

function getBucketByName(nm, lstBuckets) {
    if (!lstBuckets) return null;
    for (let i = 0; i < lstBuckets.length; i++) {
        if (lstBuckets[i].label === nm) return lstBuckets[i];
    }
    return null;
}

function uploadNavTree(s3BucketName, navtree) {
    var treeData = { navTree: navtree };
    s3upload(s3BucketName, "navtree.json", JSON.stringify(treeData), "application/json");
}

function getLayoutByID(lstLayouts, layoutID) {
    let theLayout = null;
    lstLayouts.forEach(layout => {
        if (layout.id === layoutID) theLayout = layout;
    });
    return theLayout;
}
async function s3upload(s3BucketName, opath, html, contentType) {
    console.log("Upload to S3:", s3BucketName, opath);
    await s3.putObject({
        Bucket: s3BucketName,
        Key: opath,
        Body: html,
        ACL: 'public-read', ContentType: contentType || "text/html"
    }).promise();
}
async function s3remove(s3BucketName, opath) {
    console.log("Remove from S3", opath);

    await s3.deleteObject({
        Bucket: s3BucketName,
        Key: opath
    }).promise();
}
async function removePageFromQueue(id) {
    var params = {
        TableName: tableName,
        Key: { id: id },
        UpdateExpression: "set queue = :q",
        ExpressionAttributeValues: { ":q": false }
    };
    await documentClient.update(params, function (err, data) {
        if (err) console.log(err);
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


async function DDBScan(params) {
    // this will scan beyond 1MB limit
    let lstRC = [];
    let hasMore = true;
    while (hasMore) {
        var data = await documentClient.scan(params).promise();
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

async function DDBBatchGet(params) {
    // this will scan beyond 1MB limit
    let lstRC = [];
    let hasMore = true;
    while (hasMore) {
        var data = await documentClient.batchGet(params).promise();
        for (let tname in params.RequestItems) { //params.RequestItems[tableName]
            data.Responses[tname].forEach(function (itemdata) {
                lstRC.push(itemdata);
            });
        }

        if (typeof data.LastEvaluatedKey != "undefined") {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
        } else {
            hasMore = false;
        }
    }
    return lstRC;
}
function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4();
}

function renderMicroTemplates(page) {
    // fill variables of object lists with rendered html of microtemplates
    if (!page.lstMTObj) return;
    for (var mtobjName in page.lstMTObj) {
        let mtobj = page.lstMTObj[mtobjName];
        // add field variable to page.doc object
        page.doc[mtobj.fldName] = ""; // this will hold rendered HTML of the whole object list
        mtobj.lstObj.forEach(mtentry => {
            // put fieldvalues and names into a temporary local object
            let obj = { env: page.env };
            for (let f = 0; f < mtentry.custFields.length; f++) {
                if (mtentry.custFields[f].fldValueType && mtentry.custFields[f].fldValueType === 'JSON') {
                    try {
                        obj[mtentry.custFields[f].fldName] = JSON.parse(mtentry.custFields[f].fldValue);
                    } catch (e) {
                        obj[mtentry.custFields[f].fldName] = "(Failed to parse JSON fldValue) " + mtentry.custFields[f].fldValue;
                    }
                } else if (mtentry.custFields[f].fldType && mtentry.custFields[f].fldType === 'container') {
                    // nested microtemplate -> render object list into fieldvalue
                    obj[mtentry.custFields[f].fldName] = renderNestedMicroTemplates(page, mtentry.custFields[f], page.env);
                } else {
                    obj[mtentry.custFields[f].fldName] = mtentry.custFields[f].fldValue;
                }
            }
            obj.page = page;
            page.doc[mtobj.fldName] += renderMTHTML(getMicroTemplateByID(mtentry.id), obj);
        });
    }
}
function renderNestedMicroTemplates(page, fld, g_env) {
    // Returns rendered HTML of nested MicroTemplates (now recursive)
    let rHTML = '';
    try {
        fld.lstObj.forEach(mtentry => {
            // put fieldvalues and names into a temporary local object
            let obj = { env: g_env };
            for (let f = 0; f < mtentry.custFields.length; f++) {
                if (mtentry.custFields[f].fldValueType && mtentry.custFields[f].fldValueType === 'JSON') {
                    try {
                        obj[mtentry.custFields[f].fldName] = JSON.parse(mtentry.custFields[f].fldValue);
                    } catch (e) {
                        obj[mtentry.custFields[f].fldName] = "(Failed to parse JSON fldValue) " + mtentry.custFields[f].fldValue;
                    }
                } else if (mtentry.custFields[f].fldType && mtentry.custFields[f].fldType === 'container') {
                    // nested microtemplate -> render object list into fieldvalue
                    obj[mtentry.custFields[f].fldName] = renderNestedMicroTemplates(page, mtentry.custFields[f], g_env);
                } else {
                    obj[mtentry.custFields[f].fldName] = mtentry.custFields[f].fldValue;
                }
            }
            obj.page = page;
            rHTML += renderMTHTML(getMicroTemplateByID(mtentry.id), obj);
        });
        return rHTML;
    } catch (e) {
        console.log(e);
        return '<pre>Error in nested Micro Template: ' + e.toString() + '</pre>';
    }
}
function renderMTHTML(template, opts) {
    try {
        return pug.render(template, opts);
    } catch (e) {
        console.log(e);
        return '<pre>Error in Micro Template: ' + e.toString() + '</pre>';
    }
}

function getMicroTemplateByID(id) {
    var tobj = MTTemplates[id];
    if (typeof tobj === 'undefined') return "";
    return tobj.body || '';
}

async function loadMicroTemplates(globalScripts) {
    let params = {
        TableName: tableName,
        FilterExpression: 'otype = :fld',
        ExpressionAttributeValues: { ':fld': 'MT' },
        ProjectionExpression: 'id, body'
    };

    let lstMTs = await DDBScan(params);
    lstMTs.forEach(mt => {
        MTTemplates[mt.id] = { body: globalScripts + mt.body };
    });
}

function sendSQS(msg, queueURL) {
    return new Promise((resolve, reject) => {
        var params = {
            MessageBody: JSON.stringify(msg),
            QueueUrl: queueURL,
            DelaySeconds: 0
        };
        sqs.sendMessage(params, function (err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function addBranding(html) {
    try {
        let hPos = html.indexOf('<head>');
        if (hPos < 0) hPos = html.indexOf('<HEAD>');
        if (hPos < 0) return html;
        return html.substring(0, hPos + 6) + '\n<!-- \n\nPage rendered by CloudeeCMS - Serverless CMS for AWS - www.cloudee-cms.com\n\n -->\n' + html.substring(hPos + 6, html.length);
    } catch (e) {
        return html;
    }
}

const flxTree = {
    makeTree: function (lstFlat) {
        let tree = {};
        lstFlat.forEach(pgEntry => {
            let arrCats = pgEntry.opath.split('/');
            let thisBranch;
            for (var c = 0; c < arrCats.length; c++) {
                thisBranch = this.getTreeBranch(tree, thisBranch, arrCats[c]);
                if (c == arrCats.length - 1) { // Page!
                    thisBranch.id = pgEntry.id;
                    thisBranch.link = pgEntry.opath;
                    thisBranch.navlabel = pgEntry.navlabel;
                    thisBranch.navsort = pgEntry.navsort;
                    thisBranch.dt = pgEntry.dt;
                    thisBranch.descr = pgEntry.descr;
                }
            }
        });
        // Convert format
        let newtree = this.recursiveAdd(tree);
        return newtree;
    },
    recursiveAdd: function (branch) {
        let rc = [];
        for (let row in branch) {
            let thisRow = branch[row];
            // IMPORTANT: Properties to ignore!!
            if (row !== "id" && row !== "link" && row !== "navlabel" && row !== "navsort" && row !== "dt" && row !== "descr") {
                let addElem = { "label": row };
                if (thisRow.id) {
                    addElem.etype = "Page";
                    addElem.id = thisRow.id;
                    addElem.link = '/' + thisRow.link;
                    addElem.label = thisRow.navlabel;
                    addElem.navsort = thisRow.navsort;
                    addElem.dt = thisRow.dt;
                    addElem.descr = thisRow.descr;
                } else {
                    addElem.etype = "Folder";
                }
                var subs = this.recursiveAdd(thisRow);
                if (subs.length > 0) addElem.childs = subs;
                rc.push(addElem);
            }
        }
        rc.sort((a, b) => parseFloat(a.navsort) - parseFloat(b.navsort));
        return rc;
    },
    getTreeBranch: function (treeObj, parentBranch, thisCat) {
        let theTree = parentBranch || treeObj;
        if (typeof theTree[thisCat] == "undefined") theTree[thisCat] = {};
        return theTree[thisCat];
    }
};