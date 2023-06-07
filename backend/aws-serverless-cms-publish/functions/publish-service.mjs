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
 * File Version: 2023-06-05 06:58 - RSC
 */

import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { documentClient, DDBGet, DDBQuery, DDBBatchGet, DDBScan, getNewGUID } from './lambda-utils.mjs';

import pug from 'pug';
import fs from 'fs';

const s3client = new S3Client();
const sqsclient = new SQSClient({});

const tableName = process.env.DB_TABLE || '';
const GSI1_NAME = 'GSI1-index';
let MTTemplates = {};

const pubSVC = {};

pubSVC.bulkPublishPage = async function (s3BucketName, lstPageIDs, pubtype, removeFromQueue, cfg) {
  let lstLog = [];
  try {
    if (!s3BucketName || s3BucketName === '') return { success: false, message: "S3 Bucket name not supplied", log: lstLog };

    let sessionID = getNewGUID('xxxxxx');
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
      lstPages = await DDBScan(pgParams); // TODO: migrate to GSI
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

      let layoutID = "";
      if (page.layout) layoutID = page.layout;
      let thisLayout = getLayoutByID(lstLayouts, layoutID);
      let layoutKey = thisLayout.okey || "default";

      // Convert JSON dropdown fields (defined in layout)
      convertJSONFields(page, thisLayout);

      // Render microtemplates
      renderMicroTemplates(page);

      lstLog.push("Rendering page " + page.id + " with layout " + layoutKey);
      const pageRenderer = pug.compileFile(sDir + layoutKey + ".pug", { basedir: sDir });
      let html = pageRenderer(page);

      // upload to S3
      lstLog.push("Upload to S3 (" + s3BucketName + "): " + page.opath);
      await s3upload(s3BucketName, page.opath, addBranding(html));

      // remove page from publishing queue
      if (removeFromQueue && pubtype === 'selected') {
        if (page.queue) await removePageFromQueue(page.id);
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
      await uploadNavTree(s3BucketName, pageEnv.navtree);
    }

    return { success: true, log: lstLog };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error', log: lstLog };
  }
};

pubSVC.publishPage = async function (s3BucketName, id, page, cfg) {
  // pass either a page object or ID. if page is null, page will be fetched from db
  let lstLog = [];
  try {

    if (!s3BucketName || s3BucketName === '') return { success: false, message: "S3 Bucket name not supplied", log: lstLog };

    const sessionID = getNewGUID('xxxxxxxx');
    const sDir = "/tmp/" + sessionID + "/";

    lstLog.push("Publishing page " + id + " on " + s3BucketName + " SessionID: " + sessionID);

    // create session folder
    fs.mkdirSync(sDir);

    // Get page fields from dynamoDB
    if (!page) { // get page by ID from database
      lstLog.push("Load page from DB: " + id);
      page = await DDBGet({ TableName: tableName, Key: { id: id } });
    }

    if (typeof page.doc === 'undefined') page.doc = {}; // this will hold customField values
    page.publishDT = new Date().toISOString();
    if (!page.updateDT) page.updateDT = new Date().toISOString();

    // Add config variables to page object
    page.env = await getConfigVariables(cfg);

    let layoutKey = "default";
    let layoutID = "";
    if (page.layout) layoutID = page.layout;

    // Get global Pug scripts prefix
    const globalScripts = getGlobalScripts(cfg);

    // Get all layouts and blocks, and save as pug files in session folder
    const params = {
      TableName: tableName,
      FilterExpression: 'ptype = :fld',
      ExpressionAttributeValues: { ':fld': 'pugfile' },
      ProjectionExpression: 'id, body, okey, custFields'
    };

    let thisLayout = null;
    let lstLayouts = await DDBScan(params); // TODO: migrate to GSI
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
    let html = pageRenderer(page);

    // upload to S3
    lstLog.push("Upload to S3 (" + s3BucketName + "): " + page.opath);
    await s3upload(s3BucketName, page.opath, addBranding(html));

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
      await uploadNavTree(s3BucketName, page.env.navtree);
    }

    return { success: true, log: lstLog };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error', };
  }
};
pubSVC.unpublishPage = async function (s3BucketName, id, opath, cfg) {
  let lstLog = [];
  try {
    if (s3BucketName === '') return { success: false, message: "S3 Bucket name not supplied", log: lstLog };
    lstLog.push("Unpublishing page " + id + " on " + s3BucketName);

    // remove from S3
    lstLog.push("Remove from S3 (" + s3BucketName + "): " + opath);
    await s3remove(s3BucketName, opath);

    // remove document from search index
    let indexConfig = getIndexerConfig(cfg, s3BucketName);
    if (indexConfig !== null) {
      lstLog.push("Remove from search index: " + indexConfig.ftindex);
      let indexerMsg = { "action": "remove", "tableName": tableName, "bucketName": s3BucketName, "indexName": indexConfig.ftindex, "ids": [id] };
      await sendSQS(indexerMsg, indexConfig.ftindexSQS);
    }

    return { success: true, log: lstLog };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error', };
  }
};

// --- internals ---
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

    const lst = await DDBScan(params); // TODO: migrate to GSI
    vars.navtree = flxTree.makeTree(lst);
  }
  return vars;
}
function getGlobalScripts(cfg) {
  let rc = '';
  try {
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
async function uploadNavTree(s3BucketName, navtree) {
  const treeData = { navTree: navtree };
  await s3upload(s3BucketName, "navtree.json", JSON.stringify(treeData), "application/json");
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
async function loadMicroTemplates(globalScripts) {
  const params = {
    TableName: tableName,
    FilterExpression: 'otype = :fld',
    ExpressionAttributeValues: { ':fld': 'MT' },
    ProjectionExpression: 'id, body'
  };

  let lstMTs = await DDBScan(params); // TODO: migrate to GSI
  lstMTs.forEach(mt => {
    MTTemplates[mt.id] = { body: globalScripts + mt.body };
  });
}
function renderMicroTemplates(page) {
  // fill variables of object lists with rendered html of microtemplates
  if (!page.lstMTObj) return;
  for (let mtobjName in page.lstMTObj) {
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
  let tobj = MTTemplates[id];
  if (typeof tobj === 'undefined') return "";
  return tobj.body || '';
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
function getLayoutByID(lstLayouts, layoutID) {
  let theLayout = null;
  lstLayouts.forEach(layout => {
    if (layout.id === layoutID) theLayout = layout;
  });
  return theLayout;
}
async function s3remove(s3BucketName, opath) {
  try {
    console.log("Remove from S3", opath);
    const command = new DeleteObjectCommand({ Bucket: s3BucketName, Key: opath });
    await s3client.send(command);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}
async function removePageFromQueue(id) {
  try {
    const params = {
      TableName: tableName,
      Key: { id: id },
      UpdateExpression: "set queue = :q",
      ExpressionAttributeValues: { ":q": false }
    };
    await documentClient.update(params);
    return true;
  } catch (e) {
    console.log(e);
    return null;
  }
}
async function sendSQS(msg, queueURL) {
  try {
    const params = {
      MessageBody: JSON.stringify(msg),
      QueueUrl: queueURL, DelaySeconds: 0
    };
    const command = new SendMessageCommand(params);
    await sqsclient.send(command);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}
async function s3upload(s3BucketName, opath, html, contentType) {
  try {
    console.log("Upload to S3:", s3BucketName, opath);
    const command = new PutObjectCommand({
      Bucket: s3BucketName,
      Key: opath,
      Body: html,
      ACL: 'public-read', ContentType: contentType || "text/html"
    });
    await s3client.send(command);
    return true;
  } catch (e) {
    console.log(e);
    return false;
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
        let subs = this.recursiveAdd(thisRow);
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

export { pubSVC };