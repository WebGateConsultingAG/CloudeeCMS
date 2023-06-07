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
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { BackendService } from 'src/app/services/backend.service';
import { PublishLogDialogComponent } from './PublishLogDialog';

@Component({
  selector: 'app-bulk-publish-dialog',
  templateUrl: 'BulkPublishDialog.html',
  styleUrls: ['../../pages/dialogs/PublishDialog.css']
})

export class BulkPublishDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<Component>,
    public dialog: MatDialog,
    private backendSVC: BackendService,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  selectedTargetEnv = '';
  errorMessage = '';
  lstLog: any;
  published: boolean;
  loading: boolean;
  lstPageIDs: any;
  pubtype: string;
  removeFromQueue = true;
  buckets: any = [];

  ngOnInit(): void {
    this.pubtype = this.data.pubtype;
    this.lstPageIDs = this.data.lstPageIDs;
    if (this.data.config && this.data.config.buckets) {
      this.data.config.buckets.forEach(bucket => {
        if (!bucket.noPublish) { this.buckets.push(bucket); }
      });
    }
  }
  btnCancel(): void {
    this.dialogRef.close(null);
  }
  btnPublish(): void {
    if (this.selectedTargetEnv === '') return;
    this.loading = true;
    this.published = false;
    this.errorMessage = '';
    this.lstLog = null;
    this.backendSVC.actionPublish('bulkPublishPage', { targetenv: this.selectedTargetEnv, pubtype: this.pubtype, lstPageIDs: this.lstPageIDs, removeFromQueue: this.removeFromQueue }).then(
      (data: any) => {
        if (data.success) {
          this.published = true;
        } else {
          this.errorMessage = data.message || 'Error while publishing'
        }
        this.lstLog = data.log || [];
        this.loading = false;
      },
      (err: any) => {
        console.log('Error while publishing page', err);
        this.errorMessage = (err.statusText === 'Unknown Error' ? 'Unable to track progress, this action takes longer to complete.' : err.statusText);
        this.loading = false;
      }
    );
  }
  btnViewLog(): void {
    this.dialog.open(PublishLogDialogComponent, { width: '860px', disableClose: false, data: { log: this.lstLog } });
  }
}
