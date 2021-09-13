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
 */

import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { versioninfo } from '../version';

// Authentication token will be added by MyHttpInterceptor (see modules)

@Injectable()
export class BackendService {
    constructor(private http: HttpClient) { }
    CONTENT_RES = '/content-admin';
    PUBLISH_RES = '/content-publish';
    BACKUP_RES = '/content-backup';

    NOTIFICATIONS_ENDPOINT = 'https://notifications.cloudee-cms.com/api';
    APP_VERSION_INFO = versioninfo;

    // Cache
    configDoc = null;
    lstMicroTemplates = null;
    lstLayouts = null;
    lstBlocks = null;
    lstSubmittedForms = null;
    lstForms = null;
    lstPages = null;
    imageProfiles = null;
    userGroups = [];

    public configLoaded = false;

    public isAdmin = false;
    public isUserAdmin = false;
    public isLayoutEditor = false;

    public getItemByID(theID: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getitembyid', id: theID }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public deleteItemByID(theID: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'deleteitembyid', id: theID }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public bulkDeleteByID(lstIDs: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            // tslint:disable-next-line: max-line-length object-literal-shorthand
            { action: 'bulkdeleteitem', lstIDs: lstIDs }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public duplicatePage(theID: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'duplicatepage', id: theID }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getPageByID(theID: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getpagebyid', id: theID }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public savePage(page: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'savepage', obj: page }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getBlockByID(theID: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getblockbyid', id: theID }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public saveBlock(block: any) {
        this.lstBlocks = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveblock', obj: block }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public saveForm(frm: any) {
        this.lstForms = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveform', obj: frm }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public saveMicroTemplate(mt: any) {
        this.lstMicroTemplates = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'savemicrotemplate', obj: mt }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public saveLayout(layout: any) {
        this.lstLayouts = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'savelayout', obj: layout }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getAllBlocks(forceUpdate: boolean) {
        if (forceUpdate || !this.lstBlocks) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getallblocks' }).toPromise().then((result: any) => {
                    this.lstBlocks = result.data || null;
                    return this.lstBlocks;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstBlocks); });
        }
    }
    public getAllMicroTemplates(forceUpdate) {
        if (forceUpdate || !this.lstMicroTemplates) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getallmt' }).toPromise().then((result: any) => {
                    this.lstMicroTemplates = result.data || null;
                    return this.lstMicroTemplates;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstMicroTemplates); });
        }
    }
    public getAllPages(forceUpdate) {
        if (forceUpdate || !this.lstPages) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getallpages' }).toPromise().then((result: any) => {
                    this.lstPages = result.data || null;
                    return this.lstPages;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstPages); });
        }
    }
    public getPublicationQueue() { // Non-cached call
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getpublicationqueue' }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public addAllToPublicationQueue() {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'addalltopublicationqueue' }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getAllLayouts(forceUpdate: boolean) {
        if (forceUpdate || !this.lstLayouts) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getalllayouts' }).toPromise().then((result: any) => {
                    this.lstLayouts = result.data || null;
                    return this.lstLayouts;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstLayouts); });
        }
    }
    public getAllForms(forceUpdate: boolean) {
        if (forceUpdate || !this.lstForms) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getallforms' }).toPromise().then((result: any) => {
                    this.lstForms = result.data || null;
                    return this.lstForms;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstForms); });
        }
    }
    public getAllSubmittedForms(forceUpdate: boolean) {
        // never cached
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getallsubmittedforms' }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public publishPage(targetEnv: string, thisID: string, thisPage: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.PUBLISH_RES,
            { action: 'publishpage', id: thisID, page: thisPage, targetenv: targetEnv }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public bulkPublishPage(targetEnv: string, pubtype: string, lstPageIDs: any, removeFromQueue: boolean) {
        return this.http.post(environment.API_Gateway_Endpoint + this.PUBLISH_RES,
            // tslint:disable-next-line: max-line-length object-literal-shorthand
            { action: 'bulkpublishpage', pubtype: pubtype, lstPageIDs: lstPageIDs, targetenv: targetEnv, removeFromQueue: removeFromQueue }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public unpublishPage(targetEnv: string, thisID: string, thisopath: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.PUBLISH_RES,
            { action: 'unpublishpage', id: thisID, opath: thisopath, targetenv: targetEnv }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public publishFeeds(targetEnv: string, lstFeeds: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.PUBLISH_RES,
            { action: 'publishfeeds', lstFeeds, targetenv: targetEnv }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public createDBBackup(targetEnv: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.BACKUP_RES,
            { action: 'createBackup', targetenv: targetEnv }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public importPackage(targetEnv: string, S3key: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.BACKUP_RES,
            { action: 'importPackage', targetenv: targetEnv, s3key: S3key }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public invalidateCF(targetCF: string, lstPaths: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            // tslint:disable-next-line: max-line-length object-literal-shorthand
            { action: 'invalidateCF', targetCF: targetCF, lstPaths: lstPaths }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getConfig(forceUpdate: boolean) {
        if (forceUpdate || !this.configDoc) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getconfig' }).toPromise().then((result: any) => {
                    this.configDoc = result.data || null;
                    this.configLoaded = true;
                    return this.configDoc;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.configDoc); });
        }
    }
    public saveConfig(conf: any) {
        this.configDoc = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveconfig', obj: conf }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getImageProfiles(forceUpdate: boolean) {
        if (forceUpdate || !this.imageProfiles) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getimageprofiles' }).toPromise().then((result: any) => {
                    this.imageProfiles = result.data || null;
                    return this.imageProfiles;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.imageProfiles); });
        }
    }
    public saveImageProfiles(imageProfiles: any) {
        this.imageProfiles = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveimageprofiles', obj: imageProfiles }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getNotifications() {
        const updatesDisabled = environment.enableOnlineUpdates !== true;
        const payload = {
            action: 'getnotifications', versioninfo: this.APP_VERSION_INFO, instanceID: '', dnt: true,
            repobranch: 'master', updatesdisabled: updatesDisabled
        };
        if (this.configDoc && this.configDoc.cfg) {
            payload.repobranch = this.configDoc.cfg.repobranch || 'master';
            if (!this.configDoc.cfg.dnt === true) {
                payload.instanceID = this.configDoc.cfg.instanceID;
                payload.dnt = false;
            }
        }
        return this.http.post(this.NOTIFICATIONS_ENDPOINT + '/notifications',
            payload).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public checkForUpdates() {
        const payload = { action: 'checkforupdates', versioninfo: this.APP_VERSION_INFO, repobranch: 'master' };
        if (this.configDoc && this.configDoc.cfg) { payload.repobranch = this.configDoc.cfg.repobranch || 'master'; }
        return this.http.post(this.NOTIFICATIONS_ENDPOINT + '/notifications',
            payload).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public startUpdate() {
        const payload = { action: 'startUpdate', versioninfo: this.APP_VERSION_INFO, repobranch: 'master' };
        if (this.configDoc && this.configDoc.cfg) { payload.repobranch = this.configDoc.cfg.repobranch || 'master'; }
        return this.http.post(environment.API_Gateway_Endpoint + this.BACKUP_RES, payload).toPromise().then((result: any) => {
            return result.data || null;
        });
    }
    public getPipelineStatus() {
        return this.http.post(environment.API_Gateway_Endpoint + this.BACKUP_RES,
            { action: 'getpipelinestatus', versioninfo: this.APP_VERSION_INFO }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public listCognitoUsers(maxEntries: number, nextToken: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            // tslint:disable-next-line: object-literal-shorthand
            { action: 'listusers', maxResults: maxEntries, nextToken: nextToken }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getCognitoUser(thisID: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getcognitouser', id: thisID }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public saveCognitoUser(thisUsr: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'savecognitouser', usr: thisUsr }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public toggleCognitoUser(id: any, enable: boolean) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            // tslint:disable-next-line: object-literal-shorthand
            { action: 'toggleCognitoUser', id: id, enable: enable }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public deleteCognitoUser(thisID: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'deletecognitouser', id: thisID }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public createCognitoUser(thisUsr: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'createcognitouser', usr: thisUsr }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public cognitoListGroups() {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'cognitolistgroups' }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public cognitoAddUserToGroup(userID: string, groupName: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'cognitoaddusertogroup', id: userID, groupname: groupName }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public cognitoRemoveUserFromGroup(userID: string, groupName: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'cognitoremoveuserfromgroup', id: userID, groupname: groupName }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getAllMTIDsInUse() {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getallmtidsinuse' }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
    public getAllPagesByMT(mtid: string) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'getallpagesbymt', mtid }).toPromise().then((result: any) => {
                return result.data || null;
            });
    }
}
