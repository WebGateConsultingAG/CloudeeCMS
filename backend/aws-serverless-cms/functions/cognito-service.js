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


// Ref: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/Welcome.html
// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CognitoIdentityServiceProvider.html

const AWS = require('aws-sdk');
const csclient = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-19' /*,region: 'eu-central-1'*/ });
const cognitoSvc = {};

cognitoSvc.userPoolID = process.env.CognitoUserPoolID;

cognitoSvc.listUsers = function(maxResults, nextToken, done) {
    var params = {
        UserPoolId: this.userPoolID,
        Limit: maxResults,
        PaginationToken: nextToken
    };
    
    csclient.listUsers(params, function(err, data) {
      if (err) {
            console.log(err, err.stack);
            done.error(err);
        } else {
            console.log(JSON.stringify(data));
            let usrList = data.Users.map( function(u) { return cognitoSvc.getCognitoJSObject(u)} );
            done.done({"list": usrList, "PaginationToken": data.PaginationToken});
        }
    });
};

cognitoSvc.getCognitoUser = function(id, done) {
    let that = this;
    let params = { UserPoolId: this.userPoolID, Username: id };
    csclient.adminGetUser(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            done.error(err);
        } else {
            var usr = {
                "id": data.Username,
                "UserStatus": data.UserStatus,
                "Enabled": data.Enabled
            };
            for (var i=0; i<data.UserAttributes.length;i++) {
                var entry = data.UserAttributes[i];
                if (entry.Name == "email") usr.email = entry.Value;
                if (entry.Name == "given_name") usr.given_name = entry.Value;
                if (entry.Name == "family_name") usr.family_name = entry.Value;
                if (entry.Name == "locale") usr.locale = entry.Value;
            }
            
            let gparams = { UserPoolId: that.userPoolID, Username: data.Username, Limit: 50 };
            csclient.adminListGroupsForUser(gparams, function(err2, data2) {
                if (err2) {
                    console.log("Error in adminListGroupsForUser()", err2);
                } else {
                    usr.groups = [];
                    if (data2.Groups) usr.groups = data2.Groups.map(function(v) { return v.GroupName } );
                }
                done.done({"found": true, "user": usr});
            });
        }
    });
};
cognitoSvc.deleteCognitoUser = function(id, done) {
     var params = { UserPoolId: this.userPoolID, Username: id };
     csclient.adminDeleteUser(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            done.error(err);
        } else {
            done.done({"success": true});
        }
    });
};
cognitoSvc.toggleCognitoUser = function(id, enable, done) {
     var params = { UserPoolId: this.userPoolID, Username: id };
     if (enable) {
         csclient.adminEnableUser(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                done.error(err);
            } else {
                done.done({"success": true});
            }
         });
     } else {
         csclient.adminDisableUser(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                done.error(err);
            } else {
                done.done({"success": true});
            }
        });
     }
};

cognitoSvc.createCognitoUser = function(usr, done) {
    // Note: we will not automatically send an invitation via cognito, as this requires proper email configuration
    var tempPwd = "WebGate-"+guid();
    var params = {
      UserPoolId: this.userPoolID,
      Username: usr.Username,
      ForceAliasCreation: false,
      MessageAction: "SUPPRESS",
      TemporaryPassword: tempPwd,
      UserAttributes: []
    };
    params.UserAttributes.push({"Name": "email", "Value": usr.email });
    params.UserAttributes.push({"Name": "email_verified", "Value": "True"});
    if (usr.family_name && usr.family_name!=="") params.UserAttributes.push({"Name": "family_name", "Value": usr.family_name });
    if (usr.given_name && usr.given_name!=="") params.UserAttributes.push({"Name": "given_name", "Value": usr.given_name });

    csclient.adminCreateUser(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            done.done({"success": false, "message": err});
        } else {
            done.done({"success": true, "tempPwd": tempPwd, "username": params.Username});
        }
    });
};
cognitoSvc.saveCognitoUser = function(usr, done) {
    var uAttribs = [];
    if (typeof usr.email !=="undefined") uAttribs.push( { Name: 'email', Value: usr.email } );
    if (typeof usr.given_name !=="undefined") uAttribs.push( { Name: 'given_name', Value: usr.given_name } );
    if (typeof usr.family_name !=="undefined") uAttribs.push( { Name: 'family_name', Value: usr.family_name } );
    if (typeof usr.locale  !=="undefined") uAttribs.push( { Name: 'locale', Value: usr.locale } );

    var params = {
      UserAttributes: uAttribs,
      UserPoolId: this.userPoolID,
      Username: usr.id
    };
    csclient.adminUpdateUserAttributes(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            done.error(err);
        } else {
            done.done({"success": true});
        }
    });
};

cognitoSvc.addUserToGroup = function(usrID, groupName, done) {
    console.log("Add user to group", usrID, groupName);
    let params = { GroupName: groupName, UserPoolId: this.userPoolID, Username: usrID };
    csclient.adminAddUserToGroup(params, function(err, data) {
      if (err) {
            console.log(err, err.stack);
            done.error(err);
        } else {
            done.done({"success": true});
        }
    });
};

cognitoSvc.removeUserFromGroup = function(usrID, groupName, done) {
    console.log("Remove user from group", usrID, groupName);
    let params = { GroupName: groupName, UserPoolId: this.userPoolID, Username: usrID };
    csclient.adminRemoveUserFromGroup(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            done.error(err);
        } else {
            done.done({"success": true});
        }
    });
};

cognitoSvc.listAllGroups = function(done) {
    csclient.listGroups({ UserPoolId: this.userPoolID, Limit: 50 }, function(err, data) {
      if (err) {
            console.log(err, err.stack);
            done.error(err);
        } else {
            let groups = [];
            if (data.Groups) groups = data.Groups.map(function(v) { return v.GroupName } );
            done.done({"groups": groups});
        }
    });
};

cognitoSvc.getCognitoJSObject = function(u) {
    // Translate cognito format to JSON format with fixed attribute list
    
     let uObj = {
        "Username": u.Username,
        "Enabled": u.Enabled,
        "UserCreateDate": u.UserCreateDate,
        "UserLastModifiedDate": u.UserLastModifiedDate,
        "UserStatus": u.UserStatus,
        "attribs": {}
    };
    
    for (var i=0; i<u.Attributes.length;i++) {
        let entry = u.Attributes[i];
        if (entry.Name == "email") uObj.attribs.email = entry.Value;
        if (entry.Name == "given_name") uObj.attribs.given_name = entry.Value;
        if (entry.Name == "family_name") uObj.attribs.family_name = entry.Value;
        if (entry.Name == "locale") uObj.attribs.locale = entry.Value;
    }
    return uObj;
};

module.exports.cognitoSvc = cognitoSvc;

function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4();
}