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

@Component({
  selector: 'app-mtlist',
  templateUrl: './mtlist.compo.html'
})

export class MTListComponent implements OnInit {

  constructor(
    private tabsSVC: TabsNavService,
    private backendSVC: BackendService
  ) { }

  viewList: any = [];
  viewFilter = '';
  loading = true;
  tabID = 'tab-mtlist';
  selectAll: boolean;
  showInUse = false;

  ngOnInit() {
    this.tabsSVC.addTabEvent(this.tabID, 'onTabFocus', () => {
      if (this.tabsSVC.isTabDataExpired(this.tabID)) this.loadView(true);
    });
    this.loadView(false);
  }

  loadView(forceUpdate: boolean) {
    this.showInUse = false;
    if (forceUpdate) this.setLoading(true);
    this.backendSVC.getAllMicroTemplates(forceUpdate).then(
      (data: any) => {
        if (data.success) {
          this.viewList = data.lst;
          this.selectAll = false;
          this.setSelectAll();
          this.tabsSVC.setTabDataExpired(this.tabID, false); // mark data of tab as up to date
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

  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }
  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
  setSelectAll() {
    if (!this.viewList || this.viewList.length < 1) { return; }
    this.viewList.forEach(pg => {
      pg.sel = this.selectAll;
    });
  }
  btnDelete() {
    const lstIDs = [];
    this.viewList.forEach((pg: any) => {
      if (pg.sel) { lstIDs.push(pg.id); }
    });
    if (lstIDs.length < 1) return;
    if (!confirm('Some pages will not render correctly if you delete MicroTemplates this are still in use!\nAre you sure you want to delete all selected entries?')) return;
    if (lstIDs.length > 25) this.tabsSVC.printNotification('Note: You can delete only 25 items at once');

    this.backendSVC.actionContent('bulkDeleteItem', { lstIDs }).then(
      (data: any) => {
        if (data.success) {
          this.loadView(true);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while deleting');
        }
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while deleting');
        console.log(err);
        this.setLoading(false);
      }
    );
  }
  btnCheckUsage(): void {
    if (this.viewList.length < 1) return;
    this.setLoading(true);
    // Get a list with IDs of all MTs used in pages
    this.backendSVC.actionContent('getAllMTIDsInUse', {}).then(
      (data: any) => {
        if (data.success) {
          if (data.lstMTIDs) {
            this.viewList.forEach((viewRow: any) => {
              viewRow.inUse = (data.lstMTIDs.indexOf(viewRow.id) >= 0);
            });
            this.showInUse = true;
          }
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading');
        }
        this.setLoading(false);
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while retrieving list of MicroTemplates in use.');
        console.log(err);
        this.setLoading(false);
      }
    );
  }
}
