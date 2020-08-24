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
  selector: 'app-layouts',
  templateUrl: './layouts.compo.html'
})

export class LayoutsComponent implements OnInit {

  constructor(
    private backendSVC: BackendService,
    private tabsSVC: TabsNavService
  ) { }

  viewList: any = [];
  viewFilter = '';
  loading: boolean;
  tabID = 'tab-layouts';
  selectAll: boolean;

  ngOnInit() {
    const that = this;
    this.tabsSVC.addTabEvent(this.tabID, 'onTabFocus', () => {
      if (that.tabsSVC.isTabDataExpired(that.tabID)) { that.loadView(true); }
    });
    this.loadView(false);
  }

  loadView(forceUpdate: boolean): void {
    const that = this;
    that.setLoading(true);
    this.backendSVC.getAllLayouts(forceUpdate).then(
      (data: any) => {
        that.viewList = data;
        that.setLoading(false);
        that.selectAll = false;
        that.setSelectAll();
        that.tabsSVC.setTabDataExpired(that.tabID, false); // mark data of tab as up to date
      },
      (err) => {
        console.error(err);
        that.tabsSVC.printNotification('Error while loading');
        that.setLoading(false);
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
    const that = this;
    if (!this.viewList || this.viewList.length < 1) { return; }
    this.viewList.forEach(pg => {
      pg.sel = that.selectAll;
    });
  }
  btnDelete() {
    const lstItems = [];
    this.viewList.forEach(pg => {
      if (pg.sel) { lstItems.push(pg.id); }
    });
    if (lstItems.length < 1) { return; }
    // tslint:disable-next-line: max-line-length
    if (!confirm('Pages which are still using selected Layouts will no longer render!\nAre you sure you want to delete all selected entries?')) { return; }
    const that = this;
    if (lstItems.length > 25 ) {
      that.tabsSVC.printNotification('Note: You can delete only 25 items at once');
    }
    this.backendSVC.bulkDeleteByID(lstItems).then(
      (data: any) => {
        that.loadView(true);
      },
      (err) => {
        that.tabsSVC.printNotification('Error while deleting');
        console.log(err);
        that.setLoading(false);
      }
    );
  }
}
