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

import { Component, OnInit } from '@angular/core';
import { BackendService } from 'src/app/services/backend.service';
import { TabsNavService } from 'src/app/services/tabs.service';
import { MatDialog } from '@angular/material/dialog';
import { BulkPublishDialogComponent } from './dialogs/BulkPublishDialog';
import { CFInvalidationDialogComponent } from './dialogs/CFInvalidationDialog';
import { FeedPublishDialogComponent } from './dialogs/FeedPublishDialog';

@Component({
  selector: 'app-pubqueue',
  templateUrl: './pubqueue.compo.html'
})

export class PubQueueComponent implements OnInit {

  constructor(
    private backendSVC: BackendService,
    private tabsSVC: TabsNavService,
    public dialog: MatDialog
  ) { }

  /* Note:
      This page loads ALL pages into queueList array, but renders only a subset
      to the viewList array. This will allow client-side paging, and prevent from
      selecting and publishing ALL items at once (would result in lambda timeout on large sites)
  */
  allowScrollPrev = false;
  allowScrollFwd = true;
  maxItemsPerPage = 25;
  curViewPos = 0;
  viewList: any = []; // UI list (subset of queueList)
  queueList: any = []; // full list of pages in queue
  loading: boolean;
  selectAll: boolean;
  config: any;

  ngOnInit() {
    this.loadConfig();
    this.loadView(false);
  }
  loadConfig() {
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        this.config = rc.cfg;
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while loading configuration');
      }
    );
  }
  loadView(showLoader: boolean) {
    if (showLoader) this.setLoading(true);
    this.backendSVC.actionContent('getPublicationQueue', {}).then(
      (data: any) => {
        if (data.success) {
          this.queueList = data.lst || [];
          this.renderView(0);
          this.selectAll = false;
          this.setSelectAll();
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading');
        }
        this.setLoading(false);
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while loading');
        console.log(err);
        this.setLoading(false);
      }
    );
  }
  scrollView(up: boolean) {
    this.selectAll = false;
    this.setSelectAll();
    if (up) {
      this.renderView(this.curViewPos + this.maxItemsPerPage);
    } else {
      this.renderView(this.curViewPos - this.maxItemsPerPage);
    }
  }
  renderView(sPos) {
    this.curViewPos = sPos;
    this.allowScrollFwd = true;
    this.allowScrollPrev = (sPos > 0);
    this.viewList = [];
    const maxE = sPos + this.maxItemsPerPage;
    if (this.queueList.length < 1) { return; }
    for (let i = sPos; i < this.queueList.length; i++) {
      if (i >= maxE) { return; }
      this.viewList.push(this.queueList[i]);
    }
    // if ( (sPos+this.maxItemsPerPage) < this.queueList.length )
    this.allowScrollFwd = false;
  }
  btnAddAllToPubQueue() {
    if (!confirm('This will add all pages to the publication queue.\nContinue?')) return;
    this.setLoading(true);
    this.backendSVC.actionContent('addAllToPublicationQueue', {}).then(
      (data: any) => {
        if (data.success) {
          this.queueList = data.lstPages;
          this.renderView(0);
          this.selectAll = false;
          this.setSelectAll();
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading');
        }
        this.setLoading(false);
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while loading');
        console.log(err);
        this.setLoading(false);
      }
    );
  }
  btnPublish(pubType: string) {
    const lstPages = [];
    if (pubType === 'selected') {
      if (!this.viewList || this.viewList.length < 1) { return; }
      this.viewList.forEach(pg => {
        if (pg.sel) { lstPages.push(pg.id); }
      });
      if (lstPages.length < 1) { return; }
    }
    const dialogRef = this.dialog.open(BulkPublishDialogComponent,
      { width: '650px', disableClose: false, data: { pubtype: pubType, lstPageIDs: lstPages, config: this.config } }
    );
    dialogRef.afterClosed().subscribe(result => {
      this.loadView(true); // reload queue
    });
  }
  setSelectAll() {
    if (!this.viewList || this.viewList.length < 1) { return; }
    this.viewList.forEach(pg => {
      pg.sel = this.selectAll;
    });
  }
  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }

  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }

  btnCFDialog(opaths: string[]) {
    if (!this.config.cfdists || this.config.cfdists.length < 1) {
      alert('No CloudFront Distributions configured in settings page.');
      return;
    }
    this.dialog.open(CFInvalidationDialogComponent,
      {
        width: '450px', disableClose: false, data: { cfdists: this.config.cfdists, opaths }
      });
  }
  btnFeedDialog() {
    if (!this.config.feeds || this.config.feeds.length < 1) {
      alert('No feeds configured in settings page.');
      return;
    }
    if (!this.config.cfdists || this.config.cfdists.length < 1) {
      alert('No CloudFront Distributions configured in settings page.');
      return;
    }
    if (!this.config.buckets || this.config.buckets.length < 1) {
      alert('No S3 Buckets configured in settings page.');
      return;
    }
    this.dialog.open(FeedPublishDialogComponent,
      {
        width: '450px', disableClose: false, data: { config: this.config }
      });
  }
}
