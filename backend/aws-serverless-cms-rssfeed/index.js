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

//  RSS feed generator. Add this as cron job via CloudWatch to run once a day. (05 0 * * ? *)
//  You might also issue a CloudFront invalidation request after updating your feed if served behind CF

//  Add to your HTML header:
// <link href="atom.xml" type="application/atom+xml" rel="alternate" title="My Atom feed" />
// <link href="rss.xml" type="application/rss+xml" rel="alternate" title="My RSS feed" />

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const DynamoDB = require('aws-sdk/clients/dynamodb');
const documentClient = new DynamoDB.DocumentClient({ convertEmptyValues: true });
const Feed = require('feed').Feed;

const tableName = process.env.DB_TABLE || '';       // Name of your CloudeeCMS table
const s3BucketName = process.env.S3_BUCKET || '';   // Production S3 bucket, target for sitemap.xml
const sitename = process.env.SITE_URL || '';        // URL of your site, e.g. https://example.com
const feedCategory = 'RSS-Feed';                    // Category to list in feed
const cacheMaxAge = 3600;                           // Cache max age in seconds
// process.env.TZ = 'Europe/Zurich';

exports.handler = async function (event, context, callback) {
    try {

        // Customize Feed Info according to your site (Ref: https://github.com/jpmonette/feed )
        const feed = new Feed({
            title: "Feed Title",
            description: "This is my personal feed!",
            id: sitename,
            link: sitename,
            language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
            image: "http://example.com/image.png",
            favicon: "http://example.com/favicon.ico",
            copyright: "All rights reserved 2013, John Doe",
            generator: "CloudeeCMS", // optional
            feedLinks: {
                atom: "https://example.com/atom.xml"
            },
            author: {
                name: "John Doe",
                email: "johndoe@example.com",
                link: "https://example.com/johndoe"
            }
        });

        let params = {
            TableName: tableName,
            FilterExpression: "otype = :ot AND contains(#fldC, :v1)",
            ExpressionAttributeNames: { "#fldC": "categories" },
            ExpressionAttributeValues: { ":v1": feedCategory, ":ot": "Page" },
            ProjectionExpression: 'categories, opath, title, descr, dt, img'
        };

        let lstPages = await DDBScan(params);
        lstPages.sort(function(a,b){
            return new Date(b.dt) - new Date(a.dt);
        });
        lstPages.forEach(pg => {
            feed.addItem({
                title: pg.title,
                id: sitename + "/" + pg.opath,
                link: sitename + "/" + pg.opath,
                description: pg.descr || '',
                //content: "",
                date: new Date(pg.dt),
                image: pg.img || '' // Add CDN link for cover image
              });
        });

        if (s3BucketName !== '') { 
            s3upload(s3BucketName, 'rss.xml', feed.rss2(), 'application/rss+xml');
            s3upload(s3BucketName, 'atom.xml', feed.rss2(), 'application/atom+xml');
        }

        callback(null);

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
        ACL: 'public-read',
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