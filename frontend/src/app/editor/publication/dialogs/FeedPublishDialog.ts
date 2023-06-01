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

@Component({
    templateUrl: 'FeedPublishDialog.html',
    styleUrls: ['FeedPublishDialog.css']
})

export class FeedPublishDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private backendSVC: BackendService,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    loading: boolean;
    errorMessage: string;
    cfg: any;
    lstCFDists: any = [];
    lstFeeds: any = [];
    lstBuckets: any = [];
    selectedFeeds = [];
    selectedTargetCF: string;
    selectedTargetEnv: string;
    showLog = false;
    step = 1;
    lstLog = [];

    ngOnInit(): void {
        this.cfg = this.data.config;
        this.lstFeeds = this.cfg.feeds;
        this.lstCFDists = this.cfg.cfdists;
        this.lstBuckets = this.cfg.buckets;
    }

    btnSubmit(): void {
        this.errorMessage = '';
        this.showLog = false;
        if (!this.selectedTargetEnv || this.selectedTargetEnv === '') return;
        if (!this.selectedFeeds || this.selectedFeeds.length < 1) return;
        this.errorMessage = '';
        this.loading = true;
        this.backendSVC.publishFeeds(this.selectedTargetEnv, this.selectedFeeds).then(
            (data: any) => {
                if (data.published) {
                    this.step = 2;
                } else {
                    this.errorMessage = data.errorMessage || 'There was an error while generating feeds.';
                    this.showLog = true;
                }
                if (data.errorMessage) this.errorMessage = data.errorMessage;
                if (data.log) this.lstLog = data.log;
                this.loading = false;
            },
            (err: any) => {
                console.log(err);
                this.errorMessage = 'Error while publishing feeds';
                this.loading = false;
            }
        );
    }

    btnSubmitCF() {
        this.errorMessage = '';
        this.showLog = false;
        if (!this.selectedTargetCF || this.selectedTargetCF === '') { return; }
        const lstPaths = this.selectedFeeds.map((f: any) => {
            return '/' + f.filename;
        });
        this.loading = true;
        this.backendSVC.actionCF('invalidateCF', { targetCF: this.selectedTargetCF, lstPaths }).then(
            (data: any) => {
                if (data.success) this.step = 3;
                if (data.message) this.errorMessage = data.message;
                this.loading = false;
            },
            (err: any) => {
                console.error(err);
                this.errorMessage = err.message || 'Error while submitting invalidation request';
                this.loading = false;
            }
        );
    }

    btnCancel(): void {
        this.dialogRef.close(null);
    }

}
