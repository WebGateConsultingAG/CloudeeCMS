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
 * File Version: 2023-06-06 13:55 - RSC
 */

// ES6 | nodejs18+ | AWS SDK v3

import { reCAPTCHAv3 } from './functions/reCAPTCHAv3.mjs';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { DDBGet, documentClient, getFormattedDate, getNewGUID } from './functions/lambda-utils.mjs';
import querystring from 'querystring';
import ejs from 'ejs';

const tableName = process.env.DB_TABLE || '';
const sqsclient = new SQSClient();
const snsclient = new SNSClient();

export const handler = async (event, context, callback) => {
    let redirectToFail = event.headers.referer || '/';
    try {
        let params = querystring.parse(event.body);
        let redirectToSuccess = params['redirectto'] || event.headers.referer || '/';
        const clientIP = getClientIP(event);

        let formID = params['formid'];
        if (!formID || formID === '') {
            console.log("Form submission failed due to missing formid parameter");
            return getResponse(redirectToFail);
        }

        // check captcha type
        let captchaMode = 'static';
        const staticcaptcha = params['result'] || '';
        const reCAPTCHAResponse = params['g-recaptcha-response'] || '';
        if (reCAPTCHAResponse !== '') { // switch mode if google recaptcha supplied
            console.log("Using reCAPTCHA");
            captchaMode = 'reCAPTCHAv3';
        } else {
            console.log("Using static captcha", staticcaptcha );
            if (staticcaptcha === '') return getResponse(redirectToFail);
        }

        // lookup form by id
        let formdoc = await DDBGet({ TableName: tableName, Key: { id: formID } });
        if (!formdoc || formdoc.otype !== 'Form') {
            console.log("Form submission failed due to missing form in DB", formID);
            return getResponse(redirectToFail);
        }
        if (formdoc.redirectFailure) redirectToFail = formdoc.redirectFailure;

        if (captchaMode === 'reCAPTCHAv3') {
            let gcrc = await reCAPTCHAv3.verifyResponse(formdoc.staticcaptcha, reCAPTCHAResponse, clientIP);
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
        userform.id = 'SF-' + getNewGUID('xxxxxxxx');
        userform.otype = 'SubmittedForm';
        userform.dt = new Date().getTime();
        userform.ip = clientIP || '';
        userform.referer = event.headers['referer'] || '';
        userform.title = formdoc.title || '';
        userform.email = params['email'] || '';
        userform.frm = params;
        userform.captchaMode = captchaMode;
        userform.GSI1SK = getFormattedDate(new Date()) + '/';

        await documentClient.put({ TableName: tableName, Item: userform });
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
        console.log("Sending SNS message", params);
        await snsclient.send(new PublishCommand(params));
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
async function sendSQS(msg, SQS_QUEUE_URL) {
    try {
        const params = {
            MessageBody: JSON.stringify(msg),
            QueueUrl: SQS_QUEUE_URL, DelaySeconds: 0
        };
        const command = new SendMessageCommand(params);
        await sqsclient.send(command);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}
function getClientIP(evt) {
    try {
        return evt.requestContext.identity.sourceIp || evt.headers['X-Forwarded-For'] || '';
    } catch (e) {
        return '';
    }
}
