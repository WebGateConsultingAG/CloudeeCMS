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
    COGNITO_RES = '/cognito-admin';
    CF_RES = '/cf-admin';

    NOTIFICATIONS_ENDPOINT = 'https://notifications.cloudee-cms.com/api';
    APP_VERSION_INFO = versioninfo;

    // Cache
    configDoc = null;
    lstMicroTemplates = null;
    lstLayouts = null;
    lstBlocks = null;
    lstSubmittedForms = null;
    lstForms = null;
    pageData = null;
    imageProfiles = null;
    userGroups = [];

    public configLoaded = false;

    public isAdmin = false;
    public isUserAdmin = false;
    public isLayoutEditor = false;

    // --- Backup functions (TODO: move to actionBkup)
    
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

    // --- Updater and notifications

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

    // --- Configuration

    public getConfig(forceUpdate: boolean) {
        if (forceUpdate || !this.configDoc) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getConfig' }).toPromise().then((result: any) => {
                    this.configDoc = result || null;
                    this.configLoaded = true;
                    return this.configDoc;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.configDoc); });
        }
    }
    public saveConfig(conf: any) {
        this.configDoc = null; // reset cache
        this.imageProfiles = null; // reset cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveConfig', params: { obj: conf } }).toPromise().then((result: any) => {
                return result || null;
            });
    }
    public getImageProfiles(forceUpdate: boolean) {
        if (forceUpdate || !this.imageProfiles) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getImageProfiles' }).toPromise().then((result: any) => {
                    this.imageProfiles = result || null;
                    return this.imageProfiles;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.imageProfiles); });
        }
    }
    public saveImageProfiles(imageProfiles: any) {
        this.imageProfiles = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveImageProfiles', params: { obj: imageProfiles } }).toPromise().then((result: any) => {
                return result || null;
            });
    }

    // --- Pages

    public savePage(page: any) {
        this.pageData = null; // clear page list cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'savePage', params: { obj: page } }).toPromise().then((result: any) => {
                return result || null;
            });
    }
    public getAllPages(forceUpdate: boolean) {
        if (forceUpdate || !this.pageData) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getAllPages' }).toPromise().then((result: any) => {
                    this.pageData = result || null;
                    return this.pageData;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.pageData); });
        }
    }

    // --- Layouts and microtemplates

    public getAllLayouts(forceUpdate: boolean) {
        if (forceUpdate || !this.lstLayouts) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getAllLayouts' }).toPromise().then((result: any) => {
                    this.lstLayouts = result || null;
                    return this.lstLayouts;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstLayouts); });
        }
    }
    public saveLayout(layout: any) {
        this.lstLayouts = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveLayout', params: { obj: layout } }).toPromise().then((result: any) => {
                return result || null;
            });
    }
    public getAllBlocks(forceUpdate: boolean) {
        if (forceUpdate || !this.lstBlocks) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getAllBlocks' }).toPromise().then((result: any) => {
                    this.lstBlocks = result || null;
                    return this.lstBlocks;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstBlocks); });
        }
    }
    public saveBlock(block: any) {
        this.lstBlocks = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveBlock', params: { obj: block } }).toPromise().then((result: any) => {
                return result || null;
            });
    }
    public getAllMicroTemplates(forceUpdate: boolean) {
        if (forceUpdate || !this.lstMicroTemplates) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getAllMT' }).toPromise().then((result: any) => {
                    this.lstMicroTemplates = result || null;
                    return this.lstMicroTemplates;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstMicroTemplates); });
        }
    }
    public saveMicroTemplate(mt: any) {
        this.lstMicroTemplates = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveMT', params: { obj: mt } }).toPromise().then((result: any) => {
                return result || null;
            });
    }

    // --- Forms

    public getAllForms(forceUpdate: boolean) {
        if (forceUpdate || !this.lstForms) {
            return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
                { action: 'getAllForms' }).toPromise().then((result: any) => {
                    this.lstForms = result || null;
                    return this.lstForms;
                });
        } else {
            return new Promise<any>((resolve, reject) => { resolve(this.lstForms); });
        }
    }
    public saveForm(frm: any) {
        this.lstForms = null; // invalidate cache
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES,
            { action: 'saveForm', params: { obj: frm } }).toPromise().then((result: any) => {
                return result || null;
            });
    }

    // --- Generic actions

    public actionContent(action: string, params: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CONTENT_RES, { action, params }).toPromise().then((result: any) => {
            return result || null;
        });
    }
    public actionBkup(action: string, params: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.BACKUP_RES, { action, params }).toPromise().then((result: any) => {
            return result.data || null;
        });
    }
    public actionPublish(action: string, params: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.PUBLISH_RES, { action, params }).toPromise().then((result: any) => {
            return result || null;
        });
    }
    // CloudFront API
    public actionCF(action: string, params: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.CF_RES, { action, params }).toPromise().then((result: any) => {
            return result || null;
        });
    }
    // Cognito user admin API
    public cognitoAction(action: string, params: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.COGNITO_RES, { action, params }).toPromise().then((result: any) => {
            return result || null;
        });
    }
}
