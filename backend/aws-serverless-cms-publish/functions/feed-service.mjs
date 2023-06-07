/*
 * Copyright WebGate Consulting AG, 2023
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

import { DDBScan } from './lambda-utils.mjs';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SitemapStream, streamToPromise } from 'sitemap';
import { Feed } from 'feed';

const s3client = new S3Client();
const tableName = process.env.DB_TABLE || '';
const GSI1_NAME = 'GSI1-index';

const feedSVC = {};

feedSVC.publishFeeds = async function (s3BucketName, lstFeeds, cfg) {
  let lstLog = [];
  try {
    if (s3BucketName === '') return { success: false, message: "S3 Bucket name not supplied", log: lstLog };
    let isOK = true;
    for (let i = 0; i < lstFeeds.length; i++) {
      let feed = lstFeeds[i];
      lstLog.push("Processing feed: " + feed.filename + ' (' + feed.ftype + ')');
      let feedData = await getFeedContents(feed, cfg);
      if (feedData.hasError) {
        lstLog.push("Error in feed '" + feed.filename + "': " + feedData.errormsg);
        isOK = false;
      } else {
        lstLog.push("Uploading feed: " + feed.filename);
        await s3upload(s3BucketName, feed.filename, feedData.body, feedData.contentType);
      }
    }
    lstLog.push("Uploading feeds completed");
    return { success: isOK, log: lstLog };
  } catch (e) {
    console.log(e);
    return { success: false, message: e.message || "Error", log: lstLog };
  }
};

async function getFeedContents(feed, cfg) {
  let rc = { body: '{}', contentType: 'application/json', hasError: false, errormsg: '' };
  try {
    const sitename = feed.sitename || 'https://mydomain';

    if (feed.ftype === 'Atom') {
      rc.contentType = 'application/atom+xml';

      // Get CDN link for page cover images
      const cdnBucket = getBucketByName('CDN', cfg.buckets);
      const cdnWebURL = cdnBucket ? (cdnBucket.cdnURL || '') : '';

      const atomfeed = new Feed({
        title: feed.title,
        description: feed.description,
        id: sitename,
        link: sitename,
        image: feed.image,
        favicon: feed.favicon || '',
        copyright: feed.copyright || '',
        generator: "CloudeeCMS",
        feedLinks: { atom: sitename + '/' + feed.filename }
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

function getBucketByName(nm, lstBuckets) {
  if (!lstBuckets) return null;
  for (let i = 0; i < lstBuckets.length; i++) {
    if (lstBuckets[i].label === nm) return lstBuckets[i];
  }
  return null;
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

export { feedSVC };