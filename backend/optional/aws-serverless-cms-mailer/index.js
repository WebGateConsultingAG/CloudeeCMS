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
 * File Version: 2020-05-18 0920 - RSC
 */

 /*
  This lambda function listens to an SQS queue and sends out smtp emails 
  using nodemailer. You have to manually configure an SQS queue and outgoing
  mail SES incl. domain validation etc.

  Lambda environment variables to define:
  TASK_QUEUE_URL, MAILER_HOST, MAILER_USER, MAILER_PASS, DEFAULT_SENDER

  SQS sample message:
  {
    "from": "me@mydomain.com",
    "sendto": ["name@anotherdomain.com"],
    "copyto": [],
    "subject": "Test message sent via SQS queue",
    "mailbody": "Hello<br><br>This is a message dispatched via SQS queue."
  }
*/

const AWS = require("aws-sdk");
const TASK_QUEUE_URL = process.env.TASK_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;
const sqs = new AWS.SQS({region: AWS_REGION});
const nodemailer = require('nodemailer');

var mailEnabled = true;

exports.handler = function(event, context, callback) {
  try {
    var msg = event.Records[0];
    processSQSMessage(msg, function(err) {
      if (err) {
        callback(err);
      } else {
        deleteMessage(msg.receiptHandle, callback);
      }
    });
  } catch (e) {
    console.log("error", e);
    deleteMessage(msg.receiptHandle, callback);
  }
};

function processSQSMessage(sqsmsg, cb) {
  try {
    var mailObj = JSON.parse(sqsmsg.body);

    /*
    MailObject = {
      "from": "",
      "sendto": [],
      "copyto": [],
      "subject": "",
      "mailbody": "" 
    }
    */
    
    var mailOptions = {};
    mailOptions.from = mailObj.from || process.env.DEFAULT_SENDER;
    mailOptions.subject = mailObj.subject;
    mailOptions.to = mailObj.sendto.join(",");    
    if (mailObj.copyto && mailObj.copyto.length>0) mailOptions.cc = mailObj.copyto.join(",");
    mailOptions.html = mailObj.mailbody;

    sendEmail(mailOptions);
    cb();

  } catch (e) {
    console.log("Error in processSQSMessage()", e);
    deleteMessage(sqsmsg.receiptHandle, cb);
  }
}   

function deleteMessage(receiptHandle, cb) {
  console.log("Deleting msg", receiptHandle);
  sqs.deleteMessage({ ReceiptHandle: receiptHandle, QueueUrl: TASK_QUEUE_URL }, cb);
}

async function sendEmail(mailOptions) {
  try {
      if (mailEnabled) {
        console.log("SENDING MAIL:", mailOptions);
        var transporter = nodemailer.createTransport(
          {
            host: process.env.MAILER_HOST, port: 465,
            auth: { user: process.env.MAILER_USER, pass: process.env.MAILER_PASS }
          }
        );
        if (!mailOptions.from || mailOptions.from==='') mailOptions.from = process.env.DEFAULT_SENDER;
        await transporter.sendMail(mailOptions);
        console.log("Done sending email");
      } else { // Mail not enabled
          console.error("Mailservice: Email notifications are disabled", mailOptions);
      }
  } catch (e) {
      console.log('Error in sendMail()', e);
  }
}