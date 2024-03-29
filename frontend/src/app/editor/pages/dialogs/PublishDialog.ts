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
import { Page } from '../page';
import { PublishLogDialogComponent } from '../../publication/dialogs/PublishLogDialog';

@Component({
  selector: 'app-publish-dialog',
  templateUrl: 'PublishDialog.html',
  styleUrls: ['PublishDialog.css']
})

export class PublishDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<Component>,
    public dialog: MatDialog,
    private backendSVC: BackendService,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  selectedTargetEnv: string;
  errorMessage = '';
  published: boolean;
  unpublished: boolean;
  loading: boolean;
  page: Page;
  lstLog: any;
  buckets: any = [];
  publishedPageURL: string;

  ngOnInit(): void {
    this.page = this.data.page;
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
    if (this.selectedTargetEnv === '') { return; }
    this.loading = true;
    this.published = false;
    this.unpublished = false;
    this.errorMessage = '';
    this.lstLog = null;
    this.backendSVC.actionPublish('publishPage', { targetenv: this.selectedTargetEnv, id: this.page.id, page: this.page }).then(
      (data: any) => {
        if (data.success) {
          this.published = true;
          this.publishedPageURL = this.getBucketWebURL(this.selectedTargetEnv) + this.page.opath;
        } else {
          this.errorMessage = data.message || 'Error while removing page';
        }
        this.lstLog = data.log || [];
        this.loading = false;
      },
      (err: any) => {
        console.log('Error while publishing page', err);
        this.errorMessage = 'Error while publishing page';
        this.loading = false;
      }
    );
  }
  btnUnPublish(): void {
    if (!confirm('This will remove the published page from the website bucket and the search index.\nContinue?')) return;
    if (this.selectedTargetEnv === '') { return; }
    this.loading = true;
    this.published = false;
    this.unpublished = false;
    this.errorMessage = '';
    this.lstLog = null;
    this.backendSVC.actionPublish('unpublishPage', { targetenv: this.selectedTargetEnv, id: this.page.id, opath: this.page.opath }).then(
      (data: any) => {
        if (data.success) {
          this.unpublished = true;
        } else {
          this.errorMessage = data.message || 'Error while removing page';
        }
        this.lstLog = data.log || [];
        this.loading = false;
      },
      (err: any) => {
        console.log('Error while removing page', err);
        this.errorMessage = 'Error while removing page';
        this.loading = false;
      }
    );
  }
  btnViewLog(): void {
    this.dialog.open(PublishLogDialogComponent, { width: '860px', disableClose: false, data: { log: this.lstLog } });
  }
  getBucketWebURL(selectedBucketName: string): string {
    for (let i = 0; i <= this.buckets.length; i++) {
      if (this.buckets[i].bucketname === selectedBucketName) { return this.buckets[i].webURL; }
    }
    return '';
  }
  btnCFDialog(): void {
    this.dialogRef.close({ action: 'openInvalidationDialog', opaths: ['/' + this.page.opath] });
  }
}
