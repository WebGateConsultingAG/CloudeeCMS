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

@Component({
    selector: 'app-bucketedit-dialog',
    templateUrl: 'bucketedit-dialog.html'
})

export class BucketEditDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    loading: boolean;
    bucket: any;
    isNew: boolean;
    lastBucketName: string;

    ngOnInit(): void {
        if (!this.data.bucket) { this.isNew = true; }
        this.bucket = this.data.bucket || {};
        this.lastBucketName = this.bucket.bucketname || '';
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    validateInput() {
        const webURL = this.bucket.webURL || '';
        if (webURL !== '' && webURL.lastIndexOf('/') !== webURL.length - 1) { this.bucket.webURL += '/'; }
    }
    btnDone(): void {
        let warn = '';
        if (!this.bucket.webURL.startsWith('https')) {
            warn = 'S3 Bucket Web URL should use https to avoid mixed-content warnings. \nContinue?';
        } else { // uses https
            if (this.bucket.webURL.toLowerCase().indexOf('s3-website') > 0) {
                warn = 'S3 Bucket Web URL does not support "s3-website" over SSL. You should replace "s3-website" in the URL with just "s3".';
            }
        }
        if (warn !== '') {
            if (!confirm(warn)) {
                return;
            }
        }
        if (this.bucket.bucketname !== this.lastBucketName) {
            alert('Remember to update IAM role to grant access for bucket ' + this.bucket.bucketname);
        }
        this.dialogRef.close({ action: (this.isNew ? 'add' : ''), bucket: this.bucket });
    }
}
