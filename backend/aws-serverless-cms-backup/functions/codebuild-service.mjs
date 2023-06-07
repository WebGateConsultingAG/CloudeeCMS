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
 * File Version: 2023-06-06 12:10 - RSC
 */

import { getNewGUID } from './lambda-utils.mjs';
import { CodePipelineClient, GetPipelineStateCommand, StartPipelineExecutionCommand } from "@aws-sdk/client-codepipeline";
import { CodeBuildClient, BatchGetProjectsCommand } from "@aws-sdk/client-codebuild";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import http from 'https';
const pipelineName = process.env.PIPELINE_NAME;
const pipelineBucket = process.env.PIPELINE_BUCKET;
const EXPECTED_BUILD_IMAGE = 'aws/codebuild/standard:6.0';
const codebuildSVC = {};

codebuildSVC.getBuildProjectInfo = async function () {
  try {
    const p = pipelineName.lastIndexOf("-pipeline");
    if (p < 1) return { success: false, message: 'Unable to extract project name' };
    const projectname = pipelineName.substring(0, p);
    const params = { names: [] };
    params.names.push(projectname + '-buildproject-frontend');
    params.names.push(projectname + '-buildproject-backend');
    const cbclient = new CodeBuildClient({});
    const command = new BatchGetProjectsCommand(params);
    const cbp = await cbclient.send(command);
    const buildprojects = [];
    let hasWarning = false;
    cbp.projects.forEach(bp => {
      let isOK = (EXPECTED_BUILD_IMAGE === (bp.environment.image || ''));
      if (!isOK) hasWarning = true;
      buildprojects.push({
        name: bp.name || '-untitled',
        image: bp.environment.image || '-unknown-',
        computeType: bp.environment.computeType || '-unknown-',
        isOK
      });
    });
    // encapsulate response in "data" for backwards compatibility reasons during update
    return { data: { success: true, buildinfo: { buildprojects, hasWarning, EXPECTED_BUILD_IMAGE } } };
  } catch (e) {
    console.log(e);
    return { data: { success: false, message: e.message || 'Error' } };
  }
};
codebuildSVC.getPipelineStatus = async function () {
  try {
    const cpclient = new CodePipelineClient({});
    const command = new GetPipelineStateCommand({ name: pipelineName });
    const pStatus = await cpclient.send(command);
    // encapsulate response in "data" for backwards compatibility reasons during update
    return { data: { success: true, running: hasCodePipelineStatus(pStatus, 'InProgress'), failed: hasCodePipelineStatus(pStatus, 'Failed'), pStatus } };
  } catch (e) {
    console.log(e);
    return { data: { success: false, message: e.message || 'Error' } };
  }
};
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
codebuildSVC.startUpdate = async function (payload) {
  let pStatus;
  try {
    // This will download the source ZIP and put it in CodePipeline S3 bucket then start building
    console.log('Checking status of CodePipeline', pipelineName);
    const cpclient = new CodePipelineClient({});
    const cpcommand = new GetPipelineStateCommand({ name: pipelineName });
    pStatus = await cpclient.send(cpcommand);
    console.log('pStatus', JSON.stringify(pStatus));
    if (hasCodePipelineStatus(pStatus, 'InProgress')) {
      return { data: { success: false, message: 'Update is already in progress', pStatus: pStatus } };
    }
    // Get updater info
    const updOpts = {
      host: 'notifications.cloudee-cms.com',
      path: '/api/notifications', port: 443, method: 'POST'
    };
    const updPayload = { action: "checkforupdates", versioninfo: { version: payload.version }, repobranch: payload.repobranch };
    let updDLOpts = null;
    await httpPOSTJSON(updOpts, updPayload).then(
      (jsonData) => { updDLOpts = jsonData.data || {}; },
      (err) => {
        console.log(err);
        return { data: { success: false, message: 'Failed to download update information', pStatus: pStatus || {} } };
      }
    );

    if (updDLOpts === null || !updDLOpts.updateURL || updDLOpts.updateURL === '') {
      console.log('Something is wrong with updDLOpts', updDLOpts);
      return { data: { success: false, message: 'Failed to process update information', pStatus: pStatus || {} } };
    }

    const updateSourceFilename = '/tmp/update_' + getNewGUID() + '_src.zip';
    console.log('Downloading sourcecode ZIP', updDLOpts.updateURL);

    await httpDownload(updDLOpts.updateURL, updateSourceFilename).then(
      () => { console.log("Downloaded to", updateSourceFilename); },
      (err) => { console.log(err); }
    );

    // Check if file exists
    if (!fs.existsSync(updateSourceFilename)) {
      return { data: { success: false, message: 'Failed to download update', pStatus: pStatus || {} } };
    }
    console.log(updateSourceFilename, fs.statSync(updateSourceFilename));

    // Note: If we switch to ZIP release downloads from github, we have to unpack,
    // then get rid of the root folder and pack everything again

    // Upload to pipeline source bucket
    console.log('Uploading to S3', pipelineBucket);
    let fbuf = fs.readFileSync(updateSourceFilename);
    const s3client = new S3Client();
    const s3command = new PutObjectCommand({
      Bucket: pipelineBucket, Key: 'codepipeline/cloudeecms/deploy.zip',
      Body: fbuf, ContentType: 'application/zip'
    });
    await s3client.send(s3command);

    console.log('Start CodePipeline build', pipelineName);
    const command = new StartPipelineExecutionCommand({ name: pipelineName });
    const pExec = await cpclient.send(command);
    return { data: { success: true, message: 'Update started', pStatus, pExec } };
  } catch (e) {
    console.log(e);
    return { data: { success: false, message: e.message || 'Error', pStatus: pStatus || {} } };
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
        let buf = new Buffer.alloc(bytes);
        let c = 0;

        for (let i = 0; i < bodyChunks.length; i++) {
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
      let body = [];
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

export { codebuildSVC };
