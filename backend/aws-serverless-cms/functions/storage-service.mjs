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
 * File Version: 2023-05-31 14:57 - RSC
 */

import { documentClient, DDBGet, DDBQuery, DDBScan, getNewGUID } from './lambda-utils.mjs'
const tableName = process.env.DB_TABLE || '';
const GSI1_NAME = 'GSI1-index';
const storage = {};

storage.addAllToPublicationQueue = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Page' },
      ProjectionExpression: 'id, opath, title, queue'
    };
    let lst = await DDBScan(params);
    lst.forEach((pg) => {
      if (pg.queue !== true) addPageToQueue(pg.id);
    });

    return { success: true, lstPages: lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllMTIDsInUse = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Page' },
      ProjectionExpression: 'id, lstMTObj'
    };
    let lstPages = await DDBScan(params);
    let lstMTIDs = [];
    for (let i = 0; i < lstPages.length; i++) {
      for (let f in lstPages[i].lstMTObj) {
        if (lstPages[i].lstMTObj[f].lstObj) collectNestedMTIDs(lstPages[i].lstMTObj[f].lstObj, lstMTIDs);
      }
    }
    return { success: true, lstMTIDs: lstMTIDs };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllPagesByMT = async function (mtid) {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Page' },
      ProjectionExpression: 'id, title, opath, lstMTObj'
    };
    let lstPages = await DDBScan(params); // TODO: use GSI query
    let lstPagesInUse = [];

    // Search through all pages if MTID exists
    lstPages.forEach((pg) => {
      let lstMTIDs = [];
      for (let f in pg.lstMTObj) {
        if (pg.lstMTObj[f].lstObj) collectNestedMTIDs(pg.lstMTObj[f].lstObj, lstMTIDs);
      }
      if (lstMTIDs.indexOf(mtid) >= 0) lstPagesInUse.push(pg);
    });
    return { success: true, lstPages: lstPagesInUse };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getImageProfiles = async function () {
  try {
    let doc = await DDBGet({ TableName: tableName, Key: { id: "imageprofiles" } });
    if (doc) {
      return { success: true, imgprofiles: doc };
    } else { // Create initial profile
      let profile = { "id": "imageprofiles", "lstProfiles": [] };
      await documentClient.put({ TableName: tableName, Item: profile });
      return { success: true, imgprofiles: profile };
    }
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.duplicatePage = async function (id) {
  try {
    const newID = getNewGUID();
    let doc = await DDBGet({ TableName: tableName, Key: { id: id } });
    if (!doc) return { success: false, message: 'Page not found' };
    doc.id = newID;
    doc.opath += '_1';
    doc.ftindex = false;
    doc.sitemap = false;
    doc.categories = [];
    await documentClient.put({ TableName: tableName, Item: doc });
    return { success: true, newPageID: newID };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.batchDelete = async function (lstID) {
  try {
    // max. 25 items per batchWrite request!
    const arrItems = [];
    let imax = lstID.length;
    if (imax > 25) imax = 25;
    for (let i = 0; i < imax; i++) {
      arrItems.push({ DeleteRequest: { Key: { 'id': lstID[i] } } });
    }
    const params = { RequestItems: {} };
    params.RequestItems[tableName] = arrItems;
    await documentClient.batchWrite(params);
    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.deleteItemByID = async function (id) {
  try {
    await documentClient.delete({ TableName: tableName, Key: { id: id } });
    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getItemByID = async function (id) {
  try {
    let doc = await DDBGet({ TableName: tableName, Key: { id: id } });
    return { success: true, item: doc };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getPageByID = async function (id) {
  try {
    let doc;
    if (!id || id === "" || id === "NEW") {
      doc = { Item: { id: getNewGUID(), dt: new Date(), ftindex: true, sitemap: true } };
    } else {
      doc = await DDBGet({ TableName: tableName, Key: { id: id } });
    }
    let params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Layout' },
      ProjectionExpression: 'id, okey, title, custFields'
    };

    let lstLayouts = await DDBScan(params); // TODO: use GSI query

    return { success: true, item: doc, layouts: lstLayouts };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getPublicationQueue = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld AND queue = :needsupd',
      ExpressionAttributeValues: { ':fld': 'Page', ':needsupd': true },
      ProjectionExpression: 'id, opath, title'
    };
    let lst = await DDBScan(params); // TODO: use GSI query
    return { success: true, lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllSubmittedForms = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'SubmittedForm' },
      ProjectionExpression: 'id, title, dt, email'
    };
    let lst = await DDBScan(params); // TODO: use GSI query
    return { success: true, lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllMicroTemplates = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'MT' },
      ProjectionExpression: 'id, custFields, otype, title, descr, fldPreview, icon'
    };
    let lst = await DDBScan(params); // TODO: use GSI query
    return { success: true, lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllBlocks = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Block' },
      ProjectionExpression: 'id, okey, title, descr'
    };
    let lst = await DDBScan(params); // TODO: use GSI query
    return { success: true, lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllPages = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Page' },
      ProjectionExpression: 'id, opath, title'
    };
    let lst = await DDBScan(params); // TODO: use GSI query
    // build a category tree
    let tree = flxTree.makeTree(lst);
    return { success: true, lstPages: lst, tree };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllForms = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Form' },
      ProjectionExpression: 'id, title, descr'
    };
    let lst = await DDBScan(params); // TODO: use GSI query
    return { success: true, lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getAllLayouts = async function () {
  try {
    const params = {
      TableName: tableName,
      FilterExpression: 'otype = :fld',
      ExpressionAttributeValues: { ':fld': 'Layout' },
      ProjectionExpression: 'id, okey, title, descr'
    };
    let lst = await DDBScan(params);  // TODO: use GSI query
    return { success: true, lst };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.getConfig = async function (userGroups) {
  try {
    let cfg = await DDBGet({ TableName: tableName, Key: { id: "config" } });
    if (cfg) {
      return { success: true, cfg, userGroups };
    } else { // Create initial config
      let cfgNew = { "id": "config", "apptitle": "CloudeeCMS" };
      await documentClient.put({ TableName: tableName, Item: cfgNew });
      return { success: true, cfg: cfgNew, userGroups: userGroups };
    }
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.saveConfig = async function (obj) {
  try {
    let id = obj.id || 'config';
    if (id !== 'config') return { success: false, message: 'Wrong object type' };
    obj.id = id;
    await documentClient.put({ TableName: tableName, Item: obj });
    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.saveLayout = async function (obj) {
  try {
    let otype = obj.otype || 'Layout';
    if (otype !== 'Layout') return { success: false, message: 'Wrong object type' };
    if (!obj.id || obj.id === "" || obj.id === "NEW") obj.id = "L-" + getNewGUID('xxxxxxxx');
    obj.otype = otype;
    obj.ptype = "pugfile"; // this key is used in publish to build a list of all required pug files 
    obj.GSI1SK = "/";
    await documentClient.put({ TableName: tableName, Item: obj });
    return { success: true, id: obj.id };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.saveBlock = async function (obj) {
  try {
    let otype = obj.otype || 'Block';
    if (otype !== 'Block') return { success: false, message: 'Wrong object type' };
    if (!obj.id || obj.id === "" || obj.id === "NEW") obj.id = "C-" + getNewGUID('xxxxxxxx');
    obj.otype = "Block";
    obj.ptype = "pugfile"; // this key is used in publish to build a list of all required pug files 
    obj.GSI1SK = "/";
    await documentClient.put({ TableName: tableName, Item: obj });
    return { success: true, id: obj.id };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.saveMicroTemplate = async function (obj) {
  try {
    let otype = obj.otype || 'MT';
    if (otype !== 'MT') return { success: false, message: 'Wrong object type' };
    if (!obj.id || obj.id === "" || obj.id === "NEW") obj.id = "MT-" + getNewGUID('xxxxxxxx');
    obj.otype = "MT";
    obj.GSI1SK = "/";
    await documentClient.put({ TableName: tableName, Item: obj });
    return { success: true, id: obj.id };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.savePage = async function (obj) {
  try {
    let otype = obj.otype || 'Page';
    if (otype !== 'Page') return { success: false, message: 'Wrong object type' };
    if (!obj.id || obj.id === "" || obj.id === "NEW") obj.id = "P-" + getNewGUID('xxxxxxxx');
    obj.otype = "Page";
    obj.GSI1SK = "/";
    await documentClient.put({ TableName: tableName, Item: obj });
    return { success: true, id: obj.id };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.saveForm = async function (obj) {
  try {
    let otype = obj.otype || 'Form';
    if (otype !== 'Form') return { success: false, message: 'Wrong object type' };
    if (!obj.id || obj.id === "" || obj.id === "NEW") obj.id = "F-" + getNewGUID('xxxxxxxx');
    obj.otype = "Form";
    obj.GSI1SK = "/";
    await documentClient.put({ TableName: tableName, Item: obj });
    return { success: true, id: obj.id };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};
storage.saveImageProfiles = async function (obj) {
  try {
    obj.id = "imageprofiles";
    await documentClient.put({ TableName: tableName, Item: obj });
    return { success: true };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || 'Error' };
  }
};

// --- internals ---

function collectNestedMTIDs(lstObj, lstMTIDs) {
  for (let n = 0; n < lstObj.length; n++) {
    if (lstObj[n].id) {
      if (lstMTIDs.indexOf(lstObj[n].id) < 0) lstMTIDs.push(lstObj[n].id);
    }
    if (lstObj[n].custFields) {
      let lstCF = lstObj[n].custFields;
      for (var i = 0; i < lstCF.length; i++) {
        if (lstCF[i].fldType === 'container') collectNestedMTIDs(lstCF[i].lstObj, lstMTIDs);
      }
    }
  }
}

async function addPageToQueue(id) {
  try {
    const params = {
      TableName: tableName,
      Key: { id: id },
      UpdateExpression: "set queue = :q",
      ExpressionAttributeValues: { ":q": true }
    };
    await documentClient.update(params);
  } catch (e) {
    console.log(e);
  }
}

const flxTree = {
  makeTree: function (lstFlat) {
    let tree = {};
    lstFlat.forEach(pgEntry => {
      let thisPath = pgEntry.opath || 'UNTITLED';
      let arrCats = thisPath.split('/');
      let thisBranch;
      for (let c = 0; c < arrCats.length; c++) {
        thisBranch = this.getTreeBranch(tree, thisBranch, arrCats[c]);
        if (c === arrCats.length - 1) thisBranch.id = pgEntry.id; // page!
      }
    });
    // convert format
    let newtree = this.recursiveAdd(tree);
    return newtree;
  },
  recursiveAdd: function (branch) {
    let rc = [];
    for (let row in branch) {
      let thisRow = branch[row];
      if (row !== "id") {
        let addElem = { "label": row };
        if (thisRow.id) {
          addElem.etype = "Page";
          addElem.id = thisRow.id;
        } else {
          addElem.etype = "Folder";
        }
        let subs = this.recursiveAdd(thisRow);
        if (subs.length > 0) addElem.childs = subs;
        rc.push(addElem);
      }
    }
    return rc;
  },
  getTreeBranch: function (treeObj, parentBranch, thisCat) {
    let theTree = parentBranch || treeObj;
    if (typeof theTree[thisCat] === "undefined") theTree[thisCat] = {};
    return theTree[thisCat];
  }
};

export { storage };
