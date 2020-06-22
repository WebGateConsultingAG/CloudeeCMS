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
import { MatDialog } from '@angular/material';
import { BulkPublishDialogComponent } from './dialogs/BulkPublishDialog';
import { CFInvalidationDialogComponent } from './dialogs/CFInvalidationDialog';

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
    const that = this;
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        that.config = rc.cfg;
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading configuration');
      }
    );
  }
  loadView(showLoader: boolean) {
    const that = this;
    if (showLoader) { that.setLoading(true); }
    this.backendSVC.getPublicationQueue().then(
      (data: any) => {
        that.queueList = data.lstPages;
        that.renderView(0);
        that.setLoading(false);
        that.selectAll = false;
        that.setSelectAll();
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading');
        console.log(err);
        that.setLoading(false);
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
    if (!confirm('This will add all pages to the publication queue.\nContinue?')) { return; }
    const that = this;
    that.setLoading(true);
    this.backendSVC.addAllToPublicationQueue().then(
      (data: any) => {
        that.queueList = data.lstPages;
        that.renderView(0);
        that.setLoading(false);
        that.selectAll = false;
        that.setSelectAll();
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading');
        console.log(err);
        that.setLoading(false);
      }
    );
  }
  btnPublish(pubType: string) {
    const that = this;
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
      that.loadView(true); // reload queue
    });
  }
  setSelectAll() {
    const that = this;
    if (!this.viewList || this.viewList.length < 1) { return; }
    this.viewList.forEach(pg => {
      pg.sel = that.selectAll;
    });
  }
  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }

  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }

  btnCFDialog() {
    if (!this.config.cfdists || this.config.cfdists.length < 1) {
      alert('No CloudFront Distributions configured in settings page.');
      return;
    }
    this.dialog.open(CFInvalidationDialogComponent, { width: '450px', disableClose: false, data: { cfdists: this.config.cfdists } });
  }
}
