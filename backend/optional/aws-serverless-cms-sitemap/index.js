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
 * File Version: 2020-07-23 0714 - RSC
 */


//  sitemap.xml generator. Add this as cron job via CloudWatch to run once or twice a day. (05 0 * * ? *)

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const DynamoDB = require('aws-sdk/clients/dynamodb');
const documentClient = new DynamoDB.DocumentClient({ convertEmptyValues: true });
const { SitemapStream, streamToPromise } = require('sitemap');

const tableName = process.env.DB_TABLE || '';       // Name of your CloudeeCMS table
const s3BucketName = process.env.S3_BUCKET || '';   // Production S3 bucket, target for sitemap.xml
const sitename = process.env.SITE_NAME || '';       // https://yourdomain.com
const cacheMaxAge = 43200;                          // Cache max age in seconds
// process.env.TZ = 'Europe/Zurich';

exports.handler = async function (event, context, callback) { 
    try {
        const sitemap = new SitemapStream({ hostname: sitename });
        //sitemap.write({ url: '', changefreq: 'weekly' });
        
        let params = {
            TableName: tableName,
            FilterExpression : 'otype = :fld AND sitemap = :fsm',
            ExpressionAttributeValues : {':fld': 'Page', ':fsm': true},
            ProjectionExpression: 'opath, pubdate' // add pubdate
        };
     
        let lstPages = await DDBScan(params);
        lstPages.forEach( pg => {
            if (pg.opath!=="index.html") sitemap.write({ url: '/'+pg.opath, changefreq: 'weekly' });
        });
        sitemap.end();
    
        let sm = await streamToPromise(sitemap);
        
        if (s3BucketName!=='') s3upload(s3BucketName, 'sitemap.xml', sm.toString(), 'text/xml');
        
        callback(null, sm.toString());
        
    } catch (e) {
        console.error(e);
    }
};
async function s3upload(s3BucketName, opath, content, contentType) {
    console.log("Upload to S3:", s3BucketName, opath);
    await s3.putObject({
        Bucket: s3BucketName,
        Key: opath,
        Body: content,
        ACL:'public-read', 
        ContentType: contentType,
        CacheControl: 'max-age=' + cacheMaxAge
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