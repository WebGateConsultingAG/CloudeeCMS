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
import { BackendService } from 'src/app/services/backend.service';
import { FileAdminService } from 'src/app/services/fileadmin.service';

@Component({
    selector: 'app-restore-dialog',
    templateUrl: 'restore-dialog.html',
    styles: [`.logdisplay { font-size: 11px; overflow: scroll; max-height: 400px; border: 1px solid lightgray; }`]
})

export class ImportDialogComponent implements OnInit {
    constructor(
        private backendSVC: BackendService,
        private fileSVC: FileAdminService,
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    message = '';
    loading: boolean;
    showImportButton = true;
    bucket: string;
    backupLog = [];
    s3key = '';
    files = [];
    requireRestart: boolean;

    ngOnInit(): void {
        this.bucket = this.data.bucket;
        this.listFiles('backup/');
    }

    listFiles(strPath: string) {
        this.loading = true;
        this.fileSVC.fileAdminAction('listFiles', { bucketName: this.bucket, bucketURL: '', path: strPath }).then(
            (data: any) => {
                if (data.success) {
                    this.files = data.lstFiles || [];
                    this.showImportButton = this.files.length > 0;
                } else {
                    this.errorMessage = data.message || 'Error while loading files';
                }
                this.loading = false;
            },
            (err) => {
                this.errorMessage = 'Error while loading files';
                console.error(err);
                this.loading = false;
                this.showImportButton = false;
            }
        );
    }

    btnImport(): void {
        if (!confirm('Do you really want to import this package?')) return;
        this.errorMessage = '';
        this.message = '';
        this.backupLog = [];
        this.loading = true;
        this.backendSVC.actionBkup('importPackage', { targetenv: this.bucket, s3key: this.s3key }).then(
            (data: any) => {
                this.loading = false;
                if (data.log) { this.backupLog = data.log; }
                if (data.success) {
                    this.message = 'Package imported';
                    this.showImportButton = false;
                    this.requireRestart = true;
                } else {
                    this.errorMessage = data.message || 'Error while processing package';
                }
            },
            (err: any) => {
                console.error(err);
                this.backupLog.push(err.status + ': ' + err.message);
                this.errorMessage = 'Error while processing';
                this.showImportButton = false;
                this.loading = false;
            }
        );
    }

    btnCancel(): void {
        if (this.requireRestart) {
            if (confirm('Restart of Webapplication recommended.\nRestart now?')) { window.location.reload(); }
        }
        this.dialogRef.close(null);
    }
}
