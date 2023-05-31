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
 * File Version: 2023-05-31 06:53
 */

const DynamoDB = require('aws-sdk/clients/dynamodb');
const documentClient = new DynamoDB.DocumentClient({ convertEmptyValues: true });
const querystring = require('querystring');
const tableName = process.env.DB_TABLE || '';
const AWSSQS = require('aws-sdk/clients/sqs');
const AWSSNS = require('aws-sdk/clients/sns');
const sqs = new AWSSQS();
const sns = new AWSSNS();
const ejs = require('ejs');

const reCAPTCHA = require('./reCAPTCHAv3');

exports.handler = async (event) => {
    let redirectToFail = event.headers.referer || '/';
    try {
        let params = querystring.parse(event.body);
        let redirectToSuccess = params['redirectto'] || event.headers.referer || '/';
        const clientIP = getClientIP(event);

        let formID = params['formid'];
        if (!formID || formID === '') return getResponse(redirectToFail);

        // check captcha type
        let captchaMode = 'static';
        const staticcaptcha = params['result'] || '';
        const reCAPTCHAResponse = params['g-recaptcha-response'] || '';
        if (reCAPTCHAResponse !== '') { // switch mode if google recaptcha supplied
            captchaMode = 'reCAPTCHAv3';
        } else {
            if (staticcaptcha === '') return getResponse(redirectToFail);
        }

        // lookup form by id
        let fdoc = await documentClient.get({ TableName: tableName, Key: { id: formID } }).promise();
        let formdoc = fdoc.Item || "";
        if (!formdoc || formdoc.otype !== 'Form') return getResponse(redirectToFail);
        if (formdoc.redirectFailure) redirectToFail = formdoc.redirectFailure;

        if (captchaMode === 'reCAPTCHAv3') {
            let gcrc = await reCAPTCHA.verifyResponse(formdoc.staticcaptcha, reCAPTCHAResponse, clientIP);
            console.log("reCAPTCHAv3 verify response", gcrc);
            if (!gcrc || !gcrc.success) return getResponse(redirectToFail);
            delete params['g-recaptcha-response']; // remove from form field list
        } else { // static captcha
            if (formdoc.staticcaptcha !== staticcaptcha) {
                console.log("Static CAPTCHA input failed", "Received: " + staticcaptcha, "Expected: " + formdoc.staticcaptcha);
                return getResponse(redirectToFail);
            }
        }

        // store the form in DB
        let userform = {};
        userform.id = 'SF-' + guid();
        userform.otype = 'SubmittedForm';
        userform.dt = new Date().getTime();
        userform.ip = clientIP || '';
        userform.referer = event.headers['referer'] || '';
        userform.title = formdoc.title || '';
        userform.email = params['email'] || '';
        userform.frm = params;
        userform.captchaMode = captchaMode;
        userform.GSI1SK = getFormattedDate(new Date()) + '/';

        await documentClient.put({ TableName: tableName, Item: userform }).promise();
        if (formdoc.redirectSuccess) redirectToSuccess = formdoc.redirectSuccess;

        // notifiy someone
        if (formdoc.notify) { await notifyByEmail(userform, formdoc, params); }
        if (formdoc.notifySNS) { await notifyBySNS(userform, formdoc, params); }

        return getResponse(redirectToSuccess);
    } catch (e) {
        console.error(e);
        return getResponse(redirectToFail);
    }
};
async function notifyBySNS(userform, formdoc, fldList) {
    try {
        const mailBody = getFormattedBody(formdoc.mailBodySNS, fldList);
        const params = {
            Message: mailBody || 'no message',
            Subject: formdoc.mailSubjectSNS || 'CloudeeCMS form notification',
            TopicArn: formdoc.snsTopicARN
        };
        console.log("sending SNS message", params);
        await sns.publish(params).promise();
    } catch (e) {
        console.error(e);
    }
}
async function notifyByEmail(userform, formdoc, fldList) {
    try {
        const mailBody = getFormattedBody(formdoc.mailBody, fldList);
        const msg = {
            "from": formdoc.mailFrom,
            "sendto": formdoc.lstEmail,
            "copyto": [],
            "subject": formdoc.mailSubject,
            "mailbody": mailBody || ''
        };
        console.log("sending message", msg);
        await sendSQS(msg, formdoc.sqsQueueURL);
    } catch (e) {
        console.error(e);
    }
}
function getFormattedBody(bodyTemplate, fldList) {
    try {
        const ejsVars = getEJSData(fldList);
        return ejs.render(bodyTemplate || '', ejsVars, { openDelimiter: '[', closeDelimiter: ']', delimiter: '%' });
    } catch (e) {
        return bodyTemplate + "\n\n---TEMPLATE ERROR---\n\n" + e.toString();
    }
}
function getEJSData(fldList) {
    try {
        let ejsVars = JSON.parse(JSON.stringify(fldList));
        let allFields = '';
        for (let fld in fldList) { // Also add all fields combined as string in ALLFIELDS variable
            allFields += fld + ": " + fldList[fld] + "\n\n";
        }
        ejsVars.FIELDLIST = allFields;
        return ejsVars;
    } catch (e) {
        console.log(e);
        return fldList || {};
    }
}
function getResponse(redirectTo) {
    return {
        statusCode: 302,
        body: 'Redirecting..',
        headers: { Location: redirectTo }
    };
}
function sendSQS(msg, SQS_QUEUE_URL) {
    return new Promise((resolve, reject) => {
        var params = {
            MessageBody: JSON.stringify(msg),
            QueueUrl: SQS_QUEUE_URL,
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
function guid() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) }
    return s4() + s4();
}
function getFormattedDate(strDT) {
    try {
        if (!strDT || strDT === '') return '';
        let dt = new Date(strDT);
        dt.setMinutes(dt.getMinutes());
        const newDT = dt.getFullYear() + '-';
        const m = dt.getMonth() + 1;
        const d = dt.getDate();
        return newDT + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
    } catch (e) {
        console.log(e);
        return '';
    }
};
function getClientIP(evt) {
    try {
        return evt.requestContext.identity.sourceIp || evt.headers['X-Forwarded-For'] || '';
    } catch (e) {
        return '';
    }
}
