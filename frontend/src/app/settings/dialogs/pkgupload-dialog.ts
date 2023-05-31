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
import { FileAdminService } from '../../services/fileadmin.service';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-pkgupload-dialog',
    templateUrl: 'pkgupload-dialog.html',
    styleUrls: ['./pkgupload-dialog.css']
})

export class PackageUploadDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private backendSVC: BackendService,
        private fileSVC: FileAdminService,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    filelist = [];
    installLog = [];
    uploading = false;
    installing = false;
    uploadSuccessful = false;
    progress; // observable
    errorMessage = '';
    accept = 'application/zip,application/x-zip,application/x-zip-compressed';
    uplPath = 'tmp-packageimport/';
    bucket: string;
    showFileSelection = true;
    showUploader = false;
    showImporterLoading = false;
    installMsg: string;
    requireRestart: boolean;

    public files: Set<File> = new Set();

    ngOnInit(): void {
        this.bucket = this.data.targetEnv;
    }

    btnDialogClose(): void {
        if (this.requireRestart) {
            if (confirm('Restart of Webapplication recommended.\nRestart now?')) { window.location.reload(); }
        }
        this.dialogRef.close(null);
    }

    public startFileUpload(selectedFiles) {
        this.showUploader = true;
        this.errorMessage = '';
        for (const key in selectedFiles) { if (!isNaN(parseInt(key, 10))) { this.files.add(selectedFiles[key]); } }

        // Get a presigned upload policy from lambda
        this.fileSVC.fileAdminAction('getsigneduploadpolicy', { bucketName: this.bucket, keyPrefix: this.uplPath }).then(
            (reqdata: any) => {
                if (reqdata.success) {
                    this.processUploads(reqdata.data);
                } else {
                    this.errorMessage = reqdata.message || 'Error while getting signed upload policy';
                }
            },
            (err) => {
                this.errorMessage = 'Error while getting signed upload policy';
                console.log('Error in getSignedUploadPolicy', err);
            }
        );

    }
    private processUploads(s3policy: any) {
        this.uploading = true;
        this.progress = this.fileSVC.upload(this.files, this.uplPath, s3policy, null);
        const allProgressObservables = [];
        // tslint:disable-next-line: forin
        for (const key in this.progress) { allProgressObservables.push(this.progress[key].progress); }

        forkJoin(allProgressObservables).subscribe(end => {
            console.log('Upload completed', this.progress);
            this.uploading = false;
            this.showUploader = false;
            this.showFileSelection = false;
            const lst = [];
            // tslint:disable-next-line: forin
            for (const f in this.progress) {
                lst.push({ nm: this.progress[f].nm, s3key: this.progress[f].s3key });
            }
            this.processUploadedPackage(lst[0]);
        });
    }
    processUploadedPackage(pkg: any): void {
        console.log('processUploadedPackage', pkg);
        const that = this;
        this.showImporterLoading = true;
        this.installMsg = 'Installing ' + pkg.nm;
        this.installing = true;
        this.installLog = [];
        const pkgKey = pkg.s3key;
        this.backendSVC.importPackage(this.bucket, pkg.s3key).then(
            (data: any) => {
                that.installing = false;
                if (data.log) { that.installLog = data.log; }
                if (data.success) {
                    that.installMsg = 'Package imported';
                    that.requireRestart = true;
                }
                that.removePackage(pkgKey);
            },
            (err) => {
                console.error(err);
                that.installing = false;
                that.installLog.push(err.status + ': ' + err.message);
                that.errorMessage = 'Error while processing package';
                that.removePackage(pkgKey);
            }
        );
    }
    removePackage(key: string) {
        console.log('Removing package after import', key);
        this.fileSVC.fileAdminAction('deleteFile', { bucketName: this.bucket, key }).then(
            (data: any) => {
                if (data.success) {
                    console.log('Package removed from temporary storage');
                } else {
                    console.log(data.message || "Error while removing package from temporary storage.");
                }
            },
            (err) => {
                console.error(err);
            }
        );
    }
}

