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
 * File Version: 2023-05-30 0914 - RSC
 */

import {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminGetUserCommand,
    AdminListGroupsForUserCommand,
    AdminDeleteUserCommand,
    AdminEnableUserCommand,
    AdminDisableUserCommand,
    AdminCreateUserCommand,
    AdminUpdateUserAttributesCommand,
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    ListGroupsCommand
} from "@aws-sdk/client-cognito-identity-provider";

const csclient = new CognitoIdentityProviderClient();
const cognitoSvc = {};
const USERPOOL_ID = process.env.CognitoUserPoolID;

cognitoSvc.listUsers = async function (maxResults, nextToken) {
    try {
        const input = { // ListUsersRequest
            UserPoolId: USERPOOL_ID,
            Limit: maxResults,
            PaginationToken: nextToken
        };
        const command = new ListUsersCommand(input);
        const response = await csclient.send(command);
        const usrList = response.Users.map((u) => { return cognitoSvc.getCognitoJSObject(u) });
        return ({ success: true, list: usrList, PaginationToken: response.PaginationToken });
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.getCognitoUser = async function (id) {
    try {
        const command = new AdminGetUserCommand({ UserPoolId: USERPOOL_ID, Username: id });
        const data = await csclient.send(command);
        const usr = {
            id: data.Username,
            UserStatus: data.UserStatus,
            Enabled: data.Enabled,
            groups: []
        };
        for (let i = 0; i < data.UserAttributes.length; i++) {
            let entry = data.UserAttributes[i];
            if (entry.Name === "email") usr.email = entry.Value;
            if (entry.Name === "given_name") usr.given_name = entry.Value;
            if (entry.Name === "family_name") usr.family_name = entry.Value;
            if (entry.Name === "locale") usr.locale = entry.Value;
        }
        // Lookup groups of user
        const gcommand = new AdminListGroupsForUserCommand({ UserPoolId: USERPOOL_ID, Username: data.Username, Limit: 50 });
        const data2 = await csclient.send(gcommand);

        if (data2.Groups) usr.groups = data2.Groups.map((v) => { return v.GroupName });
        return { success: true, found: true, user: usr };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.deleteCognitoUser = async function (id) {
    try {
        console.log("Delete Cognito User:", id);
        const command = new AdminDeleteUserCommand({ UserPoolId: USERPOOL_ID, Username: id });
        await csclient.send(command);
        return { success: true };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.toggleCognitoUser = async function (Username, enable) {
    try {
        const input = { UserPoolId: USERPOOL_ID, Username };
        if (enable) {
            const commandEnable = new AdminEnableUserCommand(input);
            await csclient.send(commandEnable);
        } else {
            const commandDisable = new AdminDisableUserCommand(input);
            await csclient.send(commandDisable);
        }
        return { success: true };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.createCognitoUser = async function (usr) {
    try {
        // Note: we will not automatically send an invitation via cognito, as this requires proper email configuration
        const tempPwd = "WebGate-" + guid();
        const params = {
            UserPoolId: USERPOOL_ID,
            Username: usr.Username,
            ForceAliasCreation: false,
            MessageAction: "SUPPRESS",
            TemporaryPassword: tempPwd,
            UserAttributes: []
        };
        params.UserAttributes.push({ "Name": "email", "Value": usr.email });
        params.UserAttributes.push({ "Name": "email_verified", "Value": "True" });
        if (usr.family_name && usr.family_name !== "") params.UserAttributes.push({ "Name": "family_name", "Value": usr.family_name });
        if (usr.given_name && usr.given_name !== "") params.UserAttributes.push({ "Name": "given_name", "Value": usr.given_name });

        const command = new AdminCreateUserCommand(params);
        await csclient.send(command);

        return { success: true, tempPwd: tempPwd, username: params.Username };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.saveCognitoUser = async function (usr) {
    try {
        const uAttribs = [];
        if (typeof usr.email !== "undefined") uAttribs.push({ Name: 'email', Value: usr.email });
        if (typeof usr.given_name !== "undefined") uAttribs.push({ Name: 'given_name', Value: usr.given_name });
        if (typeof usr.family_name !== "undefined") uAttribs.push({ Name: 'family_name', Value: usr.family_name });
        if (typeof usr.locale !== "undefined") uAttribs.push({ Name: 'locale', Value: usr.locale });

        const command = new AdminUpdateUserAttributesCommand({ UserAttributes: uAttribs, UserPoolId: USERPOOL_ID, Username: usr.id });
        await csclient.send(command);
        return { success: true };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.addUserToGroup = async function (usrID, groupName) {
    try {
        console.log("Add user to group", usrID, groupName);
        const command = new AdminAddUserToGroupCommand({ GroupName: groupName, UserPoolId: USERPOOL_ID, Username: usrID });
        await csclient.send(command);
        return { success: true };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.removeUserFromGroup = async function (usrID, groupName) {
    try {
        console.log("Remove user from group", usrID, groupName);
        const command = new AdminRemoveUserFromGroupCommand({ GroupName: groupName, UserPoolId: USERPOOL_ID, Username: usrID });
        await csclient.send(command);
        return { success: true };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.listAllGroups = async function () {
    try {
        const command = new ListGroupsCommand({ UserPoolId: USERPOOL_ID, Limit: 50 });
        const data = await csclient.send(command);
        let groups = [];
        if (data.Groups) groups = data.Groups.map((v) => { return v.GroupName });
        return { success: true, groups };
    } catch (e) {
        console.log(e);
        return { success: false, message: e.message || 'Error' };
    }
};
cognitoSvc.getCognitoJSObject = function (u) {
    // Translate cognito format to JSON format with fixed attribute list
    let uObj = {
        "Username": u.Username,
        "Enabled": u.Enabled,
        "UserCreateDate": u.UserCreateDate,
        "UserLastModifiedDate": u.UserLastModifiedDate,
        "UserStatus": u.UserStatus,
        "attribs": {}
    };

    for (var i = 0; i < u.Attributes.length; i++) {
        let entry = u.Attributes[i];
        if (entry.Name === "email") uObj.attribs.email = entry.Value;
        if (entry.Name === "given_name") uObj.attribs.given_name = entry.Value;
        if (entry.Name === "family_name") uObj.attribs.family_name = entry.Value;
        if (entry.Name === "locale") uObj.attribs.locale = entry.Value;
    }
    return uObj;
};

function guid() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) }
    return s4() + s4();
}

export { cognitoSvc };
