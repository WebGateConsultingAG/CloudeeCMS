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

@Component({
    selector: 'app-fileupload-dialog',
    templateUrl: 'FileUploadDialog.html',
    styleUrls: ['./UploadDialog.css']
})

export class FileUploadDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private fileSVC: FileAdminService,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    filelist: any; // existing files
    uploading = false;
    uploadSuccessful = false;
    progress; // observable
    hasError = false;
    accept = '*/*';
    uplPath = '';
    targetEnv: string;
    showUploader = false;
    ccMaxAge = '259200';
    lstCCMaxAge = [
        { label: '1 day', val: '86400' },
        { label: '3 days', val: '259200' },
        { label: '1 week', val: '604800' },
        { label: '1 month', val: '2419200' }
    ];

    public files: Set<File> = new Set();

    ngOnInit(): void {
        this.filelist = this.data.filelist;
        this.uplPath = this.data.uplPath;
        this.targetEnv = this.data.targetEnv;
        if (this.data.accept) { this.accept = this.data.accept; }
    }

    btnDialogClose(): void {
        this.dialogRef.close(null);
    }

    public startFileUpload(selectedFiles) {
        console.log('startFileUpload');
        this.showUploader = true;
        const that = this;
        for (const key in selectedFiles) { if (!isNaN(parseInt(key, 10))) { this.files.add(selectedFiles[key]); } }

        // Get a presigned upload policy from lambda
        this.fileSVC.getSignedUploadPolicy(this.targetEnv, this.uplPath).then(
            (reqdata: any) => {
                that.processUploads(reqdata.data);
            },
            (err) => {
                that.hasError = true;
                console.log('Error in getSignedUploadPolicy', err);
            }
        );

    }
    private processUploads(s3policy: any) {
        this.uploading = true;
        this.progress = this.fileSVC.upload(this.files, this.uplPath, s3policy, this.ccMaxAge);

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
            this.dialogRef.close({ filelist: this.filelist, reload: true });
        });
    }

}
