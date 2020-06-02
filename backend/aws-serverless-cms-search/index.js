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

const algoliasearch = require('algoliasearch');

const FTclient = algoliasearch( process.env.ALGOLIA_APPID, process.env.ALGOLIA_APIKEY);
const FTindex = FTclient.initIndex( process.env.ALGOLIA_INDEXNAME );

exports.handler = async (event, context, callback) => {
    const done = _done(callback);
    switch (event.httpMethod) {
        case 'POST':
            var b = JSON.parse(event.body);
            if (b.action === "search") {
                if (!b.query || b.query==="") return done.done({ "Items": [] });
                try {
                    const content = await FTindex.search(b.query, { attributesToRetrieve: ['objectID', 'title', 'descr', 'opath'], hitsPerPage: 50 });
                    done.done({ "Items": content.hits });
                } catch (err) {
                    console.log(err);
                    done.done({ "Items": [], "error": err});
                }
            } else {
                console.log("Unsupported action: " + b.action);
            }
            break;
        default:
            done.error(new Error(`Unsupported method "${event.httpMethod}"`));
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