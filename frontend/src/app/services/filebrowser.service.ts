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
import { FileAdminService } from './fileadmin.service';
import { BackendService } from './backend.service';

@Injectable()
export class FileBrowserService {

    constructor(
        private backendSVC: BackendService,
        private fileSVC: FileAdminService,
    ) { }

    // Convenience wrapper service

    fileFilter = [];

    public listFilesOfBucket(thisBucketLabel: string, strPath: string, fileFilter: any, cb: any) {
        this.fileFilter = fileFilter || ['jpg', 'jpeg', 'png', 'gif', 'svg'];
        const that = this;
        this.backendSVC.getConfig(false).then(
            (rc: any) => {
                const config = rc.cfg;
                const bucketConfig = that.getBucketByLabel(config, thisBucketLabel);
                const bucketURL = bucketConfig.webURL || '';
                const CDN_URL = (bucketConfig.cdnURL ? bucketConfig.cdnURL + '/' : bucketURL);
                this.fileSVC.listFiles(bucketConfig.bucketname, bucketURL, strPath).then(
                    (data: any) => {
                        const filteredList = [];
                        data.lstFiles.forEach(element => {
                            if (element.otype && element.otype === 'Folder') {
                                filteredList.push(element);
                            } else {
                                if (that.isAllowedFileExt(element.Key)) { filteredList.push(element); }
                            }
                        });

                        cb(null, { folder: strPath, parentfolder: that.getParentFolder(strPath), CDNURL: CDN_URL, lst: filteredList });
                    },
                    (err) => {
                        console.error(err);
                        cb(err);
                    }
                );
            },
            (err) => {
                console.log('Error while loading configuration', err);
                cb(err);
            }
        );
    }
    getParentFolder(strPath: string) {
        if (strPath === '') { return ''; }
        const tmp = strPath.split('/');
        let newKey = '';
        for (let i = 0; i < tmp.length - 2; i++) { newKey += tmp[i] + '/'; }
        return newKey;
    }
    getBucketByLabel(config, label) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < config.buckets.length; i++) {
            if (config.buckets[i].label === label) { return config.buckets[i]; }
        }
    }
    isAllowedFileExt(fn: string): boolean {
        return this.fileFilter.indexOf(fn.split('.').pop().toLowerCase()) >= 0;
    }
}
