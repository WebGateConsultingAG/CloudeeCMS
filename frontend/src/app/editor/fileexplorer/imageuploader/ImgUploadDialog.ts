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
import { FileAdminService } from '../../../services/fileadmin.service';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-imgupload-dialog',
    templateUrl: 'ImgUploadDialog.html',
    styleUrls: ['./UploadDialog.css']
})

export class ImgUploadDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private fileSVC: FileAdminService,
        private backendSVC: BackendService,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    filelist: any; // existing files
    uploading = false;
    uploadSuccessful = false;
    progress; // observable
    hasError = false;
    errormsg = '';
    accept = 'image/*';
    uplPath = '';
    useDefaultUplPath: boolean;
    targetEnv: string;
    showUploader = false;
    lstImgProfiles = [];
    loadingProfiles = true;
    showFileSelector = true;
    selectedProfile: any;
    resizing = false;
    lstLog = [];
    showProfileSelection = false;
    config = null;

    public files: Set<File> = new Set();

    ngOnInit(): void {
        const that = this;
        this.filelist = this.data.filelist;
        this.uplPath = this.data.uplPath;
        this.targetEnv = this.data.targetEnv;
        this.useDefaultUplPath = this.data.useDefaultUplPath;
console.log("uplPath", this.uplPath);
        if (!this.targetEnv) {
            // if not invoked from file explorer, get CDN bucket name
            console.log('get CDN bucket name');
            this.loadConfig();
        }

        if (this.data.accept) { this.accept = this.data.accept; }
        // Load image profiles
        this.backendSVC.getImageProfiles(true).then(
            (rc: any) => {
                that.lstImgProfiles = rc.imgprofiles.lstProfiles;
                that.loadingProfiles = false;
                if (that.lstImgProfiles.length < 1) {
                    that.errormsg = 'No image upload profiles found. Go to Settings to configure upload and resize options first.';
                    that.hasError = true;
                } else {
                    that.showProfileSelection = true;
                }
            },
            (err) => {
                that.loadingProfiles = false;
                that.errormsg = 'Error while loading imageprofiles';
                console.error(err);
            }
        );
    }
    loadConfig() {
        const that = this;
        this.backendSVC.getConfig(false).then(
            (rc: any) => {
                that.config = rc.cfg;
                // open default CDN bucket
                const cdnBucket = that.getBucketByLabel('CDN');
                if (cdnBucket) {
                    that.targetEnv = cdnBucket.bucketname;
                }
            },
            (err) => {
                console.log('Error while loading configuration', err);
            }
        );
    }
    onProfileChange(): void {
        if (this.useDefaultUplPath) { this.uplPath = this.selectedProfile.tpath; }
    }
    btnDialogClose(): void {
        this.dialogRef.close(null);
    }

    public startFileUpload(selectedFiles) {
        console.log('startFileUpload');
        this.showProfileSelection = false;
        this.showUploader = true;
        const that = this;
        for (const key in selectedFiles) { if (!isNaN(parseInt(key, 10))) { this.files.add(selectedFiles[key]); } }

        // Get a presigned upload policy from lambda
        this.fileSVC.getSignedUploadPolicy(this.targetEnv, this.uplPath).then(
            (reqdata: any) => {
                that.processUploads(reqdata.data);
            },
            (err) => {
                that.showUploader = false;
                that.hasError = true;
                that.errormsg = 'Error in getSignedUploadPolicy';
                console.log('Error in getSignedUploadPolicy', err);
            }
        );

    }
    private processUploads(s3policy: any): void {
        this.uploading = true;
        this.showFileSelector = false;
        this.progress = this.fileSVC.upload(this.files, this.uplPath, s3policy);

        const allProgressObservables = [];
        // tslint:disable-next-line: forin
        for (const key in this.progress) { allProgressObservables.push(this.progress[key].progress); }

        forkJoin(allProgressObservables).subscribe(end => {
            console.log('All uploads completed');
            this.uploading = false;
            // tslint:disable-next-line: forin
            for (const key in this.progress) {
                this.filelist.push({ s3key: this.progress[key].s3key, nm: this.progress[key].nm });
            }
            this.showUploader = false;
            this.resizeImages(this.filelist);
        });
    }
    private resizeImages(filelist: any): void {
        this.resizing = true;
        const lstResize = filelist.map((f: any) => {
            return f.s3key;
        });
        const that = this;
        this.fileSVC.resizeImages(this.targetEnv, this.uplPath, lstResize, this.selectedProfile).then(
            (reqdata: any) => {
                console.log(reqdata);
                if (reqdata.processed) {
                    that.dialogRef.close({ reload: true });
                } else {
                    that.lstLog = reqdata.log;
                    that.hasError = true;
                }
            },
            (err) => {
                that.hasError = true;
                that.errormsg = 'Error while resizing images';
                console.log('Error while resizing images', err);
            }
        );
    }
    getBucketByLabel(bLabel: string): any {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.config.buckets.length; i++) {
            if (this.config.buckets[i].label === bLabel) {
                return this.config.buckets[i];
            }
        }
    }
}
