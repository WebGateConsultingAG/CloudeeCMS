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

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material';
import { FileAdminService } from 'src/app/services/fileadmin.service';
import { BackendService } from 'src/app/services/backend.service';


@Component({
    selector: 'app-fileselect-dialog',
    templateUrl: 'FileSelectionDialog.html',
    styles: [`
.fileExplorer .clickable { cursor: pointer; }
.fileExplorer a { text-decoration: none; color: black; }
.fileExplorer a:hover { text-decoration: underline; }
.folderActions button { margin-right: 6px; }
.hdr-row { width: 100%;}`]
})

export class FileSelectionDialogComponent implements OnInit {

    errorMessage = '';
    loading = false;
    dlgTitle: string;
    config: any;
    configLoaded: boolean;
    selectedBucket = '';
    viewList: any = [];
    cdnURL: string;
    showListing = false;
    currentKey = '';
    fileFilter = [];
    allowBucketSelection = true;

    constructor(
        public dialogRef: MatDialogRef<Component>,
        public dialog: MatDialog,
        private fileSVC: FileAdminService,
        private backendSVC: BackendService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngOnInit(): void {
        this.dlgTitle = this.data.dlgTitle;
        this.fileFilter = this.data.fileFilter;
        this.allowBucketSelection = this.data.selectedBucket ? false : true;
        this.loadConfig(this.data.selectedBucket);
    }

    btnClose(): void {
        this.dialogRef.close(null);
    }

    selectFile(thisFile: any): void {
        this.dialogRef.close({ action: 'add', fileurl: '/' + thisFile.Key });
    }

    loadConfig(preloadBucket) {
        const that = this;
        this.loading = true;
        this.backendSVC.getConfig(false).then(
            (rc: any) => {
                that.config = rc.cfg;
                that.configLoaded = true;
                that.loading = false;
                if (preloadBucket) {
                    that.selectedBucket = that.getBucketNameByLabel(preloadBucket);
                    that.loadBucket();
                }
            },
            (err) => {
                console.log('Error while loading', err);
            }
        );
    }

    loadBucket() {
        if (!this.selectedBucket || this.selectedBucket === '') { return; }
        this.listFiles('');
    }
    getBucketNameByLabel(label) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.config.buckets.length; i++) {
            if (this.config.buckets[i].label === label) { return  this.config.buckets[i].bucketname; }
        }
    }
    listFiles(strPath: string) {
        const that = this;
        this.loading = true;
        that.errorMessage = '';
        this.showListing = false;
        const bucketConfig = this.getBucketConfig(this.selectedBucket);
        const bucketURL: string = (bucketConfig ? bucketConfig.webURL || '' : '');
        this.cdnURL = (bucketConfig ? bucketConfig.cdnURL || '' : '');
        this.fileSVC.listFiles(this.selectedBucket, bucketURL, strPath).then(
            (data: any) => {
                const filteredList = [];
                data.lstFiles.forEach(element => {
                    if (element.otype && element.otype === 'Folder') {
                        filteredList.push(element);
                    } else {
                        if (that.isAllowedFileExt(element.Key)) { filteredList.push(element); }
                    }
                });
                that.viewList = filteredList;
                that.currentKey = strPath;
                that.showListing = true;
                that.loading = false;
            },
            (err) => {
                that.errorMessage = 'Error while loading files';
                console.error(err);
                that.loading = false;
            }
        );
    }
    isAllowedFileExt(fn: string): boolean {
        return this.fileFilter.indexOf(fn.split('.').pop().toLowerCase()) >= 0;
    }
    getBucketConfig(bucketName: string) {
        // tslint:disable-next-line: max-line-length prefer-for-of
        for (let i = 0; i < this.config.buckets.length; i++) { if (this.config.buckets[i].bucketname === bucketName) { return this.config.buckets[i]; } }
        return null;
    }
    openParentFolder() {
        if (this.currentKey === '') { return; }
        const tmp = this.currentKey.split('/');
        let newKey = '';
        for (let i = 0; i < tmp.length - 2; i++) { newKey += tmp[i] + '/'; }
        this.listFiles(newKey);
    }
    openItem(itm) {
        if (itm.otype === 'Folder') {
            this.listFiles(itm.Key);
        }
    }

}
