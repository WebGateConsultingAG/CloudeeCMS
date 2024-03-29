console.log('[ set-env.js ] --- Generating configuration files for angular app ---');
const fs = require('fs');
const stackinfo = require('./stackinfo.json');
const targetPathENVProd = `./src/environments/environment.prod.ts`;
const targetPathENV = `./src/environments/environment.ts`;

// Extract exported parameters from backend cloudformation stack
console.log("stackinfo.json", stackinfo);

var cfparams = {};
stackinfo.Stacks[0].Parameters.forEach(elem => {
    cfparams[elem.ParameterKey] = elem.ParameterValue;
    console.log('Parameter:', elem.ParameterKey, elem.ParameterValue);
});
stackinfo.Stacks[0].Outputs.forEach(elem => {
    cfparams[elem.OutputKey] = elem.OutputValue;
    console.log('OutputValue:', elem.OutputKey, elem.OutputValue);
});

const EnableOAUTH = process.env.EnableOAUTH;
const EnableUSERPASS = EnableOAUTH==='true'?'false':'true';
const OAUTHLoginLabel = process.env.OAUTHLoginLabel || "Sign in with IdP Account";
const OAUTHDOMAIN = process.env.OAUTHDOMAIN;
const ADMINBUCKETURL = process.env.ADMINBUCKETURL;
const S3BUCKET_ADMIN = process.env.S3BUCKET_ADMIN;
const REGION = process.env.REGION;
const APIGWURL = cfparams['APIGWURL'];
const CognitoUserPoolID = cfparams['CognitoUserPoolID'];
const CognitoClientID = cfparams['CognitoClientID'];
const ONLINEUPDATE = process.env.ONLINEUPDATE || 'false';
const OnlineUpdatesEnabled = ONLINEUPDATE==='true'?'true':'false';

console.log("CognitoUserPoolID: ", CognitoUserPoolID);
console.log("APIGWURL: ", APIGWURL);

const adminLoginURL = "https://"+S3BUCKET_ADMIN+".s3."+REGION+".amazonaws.com/scms/index.html"

console.log("**************************************************************************");
console.log("**************************************************************************");
console.log("**** URL to access CloudeeCMS application is:");
console.log(adminLoginURL);
console.log("**************************************************************************");
console.log("**************************************************************************");
// --- Prepare contents of environment.prod.ts

const envConfigFile = `export const environment = {
    /* Generated by CloudFormation using set-env.js */
    production: true,
    app_name: 'CloudeeCMS',
    lastuservar: 'cloudeecmslastuser',
    region: '${REGION}',
    userPoolId: '${CognitoUserPoolID}',
    userPoolWebClientId: '${CognitoClientID}',
    cognitoAllowUserPassLogin: ${EnableUSERPASS},
    cognitoAllowOAuthLogin: ${EnableOAUTH},
    federatedLoginLabel: '${OAUTHLoginLabel}',
    domain: '${OAUTHDOMAIN}',
    redirectURL: '${adminLoginURL}',
    enableOnlineUpdates: ${OnlineUpdatesEnabled},
    API_Gateway_Endpoint: '${APIGWURL}',
    trumbo_load_plugins: true,
    trumbooptions: {
        plugins: {
          upload: {
            serverPath: '${APIGWURL}/trumbowyg-file-upload',
            fileFieldName: 'fileToUpload',
            urlPropertyName: 'url',
            headers: { Authorization: '' },
            imageWidthModalEdit: true
          }
        }
      }
};
`;

fs.writeFile(targetPathENV, envConfigFile, function (err) {
    if (err) {
        console.log('[ set-env.js ] --- failed to write ' + targetPathENV+ ' ---');
        throw console.error(err);
    } else {
        console.log('[ set-env.js ] --- Generated: ' + targetPathENV + ' ---');
    }
});
fs.writeFile(targetPathENVProd, envConfigFile, function (err) {
    if (err) {
        console.log('[ set-env.js ] --- failed to write ' + targetPathENVProd+ ' ---');
        throw console.error(err);
    } else {
        console.log('[ set-env.js ] --- Generated: ' + targetPathENVProd + ' ---');
        console.log(envConfigFile);
    }
});
