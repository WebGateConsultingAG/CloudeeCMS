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

const DynamoDB = require('aws-sdk/clients/dynamodb');
const documentClient = new DynamoDB.DocumentClient({ convertEmptyValues: true });
const tableName = process.env.DB_TABLE || '';
const storage = {};

storage.getItemByID = async function(id, done) {
    let doc = await documentClient.get({
          TableName: tableName,
          Key: { id:  id  }
        }).promise();
    done.done({ item: doc.Item });
};
storage.deleteItemByID = async function(id, done) {
    await documentClient.delete({
          TableName: tableName,
          Key: { id:  id  }
        }).promise();
    done.done({ success: true});
};
storage.getConfig = async function(userGroups, done) {
    let doc = await documentClient.get({ TableName: tableName, Key: { id:  "config" }}).promise();
    if (doc && doc.Item) {
        done.done( { cfg: doc.Item, userGroups });
    } else { // Create initial config
        let cfg = { "id": "config", "apptitle": "CloudeeCMS" };
        await documentClient.put({ TableName: tableName, Item: cfg }).promise();
        done.done( { cfg: cfg, userGroups: userGroups });
    }
};
storage.saveConfig = async function(obj, done) {
    try {
        obj.id = "config";
        await documentClient.put({ TableName: tableName, Item: obj }).promise();
        done.done({ success: true});
    } catch (e) {
        done.done({ success: false, error: e});
    }
};
storage.duplicatePage = async function(id, done) {
    let newID = guid();
    let doc = await documentClient.get({
        TableName: tableName,
        Key: { id:  id  }
      }).promise();

    if (!doc.Item) return done.done({ success: false, message: 'Page not found' });
    
    doc.Item.id = newID;
    doc.Item.opath += '_1';
    doc.Item.ftindex = false;
    doc.Item.sitemap = false;
    doc.Item.categories = [];
    await documentClient.put({ TableName: tableName, Item: doc.Item }).promise();
    
    done.done({ success: true, newPageID: newID });
}
storage.getPageByID = async function(id, done) {
    var doc;
    if (!id || id==="" || id==="NEW") {
        doc = { Item: { id: guid(), dt: new Date(), ftindex: true, sitemap: true } };
    } else {
        doc = await documentClient.get({
          TableName: tableName,
          Key: { id:  id  }
        }).promise();
    }
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'Layout'},
        ProjectionExpression: 'id, okey, title, custFields'
    };
    
    let lstLayouts = await DDBScan(params);
    
    done.done({ item: doc.Item, layouts: lstLayouts });
};

storage.getAllBlocks = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'Block'},
        ProjectionExpression: 'id, okey, title, descr'
    };
    
    let lst = await DDBScan(params);
    done.done( lst );
};
storage.getAllMicroTemplates = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'MT'},
        ProjectionExpression: 'id, custFields, otype, title, descr, fldPreview'
    };
    
    let lst = await DDBScan(params);
    done.done( lst );
};
storage.getAllLayouts = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'Layout'},
        ProjectionExpression: 'id, okey, title, descr'
    };
    
    let lst = await DDBScan(params);
    done.done( lst );
};
storage.getAllForms = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'Form'},
        ProjectionExpression: 'id, title, descr'
    };
    
    let lst = await DDBScan(params);
    done.done( lst );
};
storage.getAllSubmittedForms = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'SubmittedForm'},
        ProjectionExpression: 'id, title, dt, email'
    };
    
    let lst = await DDBScan(params);
    done.done( lst );
};
storage.getAllPages = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'Page'},
        ProjectionExpression: 'id, opath, title'
    };
    
    let lst = await DDBScan(params);
    
    // build a category tree
    var lstTree = flxTree.makeTree(lst);
    
    done.done( { lstPages: lst, tree: lstTree} );
};
storage.getPublicationQueue = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld AND queue = :needsupd',
        ExpressionAttributeValues : {':fld' : 'Page', ':needsupd': true },
        ProjectionExpression: 'id, opath, title'
    };
    
    let lst = await DDBScan(params);
    done.done( { lstPages: lst } );
};

storage.savePage = async function(obj, done) {
    try {
        if (!obj.id || obj.id==="" || obj.id==="NEW") obj.id = "P-"+guid();
        obj.otype = "Page";
        await documentClient.put({ TableName: tableName, Item: obj }).promise();
        done.done({ success: true, id: obj.id});
    } catch (e) {
        done.done({ success: false, error: e});
    }
};
storage.saveLayout = async function(obj, done) {
    try {
        if (!obj.id || obj.id==="" || obj.id==="NEW") obj.id = "L-"+guid();
        obj.otype = "Layout";
        obj.ptype = "pugfile"; // this key is used in publish to build a list of all required pug files 
        await documentClient.put({ TableName: tableName, Item: obj }).promise();
        done.done({ success: true, id: obj.id});
    } catch (e) {
        done.done({ success: false, error: e});
    }
};
storage.saveBlock = async function(obj, done) {
    try {
        if (!obj.id || obj.id==="" || obj.id==="NEW") obj.id = "C-"+guid();
        obj.otype = "Block";
        obj.ptype = "pugfile"; // this key is used in publish to build a list of all required pug files 
        await documentClient.put({ TableName: tableName, Item: obj }).promise();
        done.done({ success: true, id: obj.id});
    } catch (e) {
        done.done({ success: false, error: e});
    }
};
storage.saveMicroTemplate = async function(obj, done) {
    try {
        if (!obj.id || obj.id==="" || obj.id==="NEW") obj.id = "MT-"+guid();
        obj.otype = "MT";
       // obj.ptype = "pugfile"; // this key is used in publish to build a list of all required pug files 
        await documentClient.put({ TableName: tableName, Item: obj }).promise();
        done.done({ success: true, id: obj.id});
    } catch (e) {
        done.done({ success: false, error: e});
    }
};
storage.saveForm = async function(obj, done) {
    try {
        if (!obj.id || obj.id==="" || obj.id==="NEW") obj.id = "F-"+guid();
        obj.otype = "Form";
        await documentClient.put({ TableName: tableName, Item: obj }).promise();
        done.done({ success: true, id: obj.id});
    } catch (e) {
        done.done({ success: false, error: e});
    }
};

storage.addAllToPublicationQueue = async function(done) {
    let params = {
        TableName: tableName,
        FilterExpression : 'otype = :fld',
        ExpressionAttributeValues : {':fld' : 'Page'},
        ProjectionExpression: 'id, opath, title, queue'
    };
    let lst = await DDBScan(params);
    
    lst.forEach(function(pg) {
        if (pg.queue!==true) addPageToQueue(pg.id);
    });
    
    done.done( { lstPages: lst } );
};

// --- internals ---

async function addPageToQueue(id) {
    var params = {
        TableName: tableName,
        Key: { id: id },
        UpdateExpression: "set queue = :q",
        ExpressionAttributeValues:{ ":q": true}
    };
    await documentClient.update(params, function(err, data) {
       if (err) console.log(err);
    }).promise();
}

async function DDBScan(params) {
    // this will scan beyond 1MB limit
    let lstRC = [];
    let hasMore = true;
    while (hasMore) {
        var data = await documentClient.scan(params).promise();
        data.Items.forEach(function(itemdata) {
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

var flxTree = {
    makeTree: function(lstFlat) {
        let tree = {};
        lstFlat.forEach(pgEntry => {
            let arrCats = pgEntry.opath.split('/');
            let thisBranch;
            for (var c=0;c<arrCats.length;c++) {
                thisBranch = this.getTreeBranch(tree, thisBranch, arrCats[c]);
                if (c==arrCats.length-1) thisBranch.id = pgEntry.id; // page!
            }        
        });

        // convert format
        let newtree = this.recursiveAdd(tree);
        return newtree;
    },
    recursiveAdd: function(branch) {
        let rc = [];
        for (let row in branch) {
            let thisRow = branch[row];
            if (row!=="id") {
                let addElem = { "label": row};
                if (thisRow.id) {
                    addElem.etype="Page";
                    addElem.id = thisRow.id;
                } else {
                    addElem.etype="Folder";
                }
                var subs = this.recursiveAdd(thisRow);
                if (subs.length>0) addElem.childs = subs;
                rc.push(addElem);
            }
        }
        return rc;
    },
    getTreeBranch: function(treeObj, parentBranch, thisCat) {
        let theTree = parentBranch || treeObj;
        if (typeof theTree[thisCat] =="undefined") theTree[thisCat] = {};
        return theTree[thisCat];
    }
};



function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + s4();
}

module.exports.storage = storage;