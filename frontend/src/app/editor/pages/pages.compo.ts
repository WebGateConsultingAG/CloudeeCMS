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
  selector: 'app-pages',
  templateUrl: './pages.compo.html'
})

export class PagesComponent implements OnInit {

  constructor(
    private backendSVC: BackendService,
    private tabsSVC: TabsNavService
  ) { }

  viewList: any = [];
  catTree: any = [];
  flatMode = false;
  viewFilter = '';
  loading: boolean;

  tabID = 'tab-pages';

  ngOnInit() {
    const that = this;
    this.tabsSVC.addTabEvent(this.tabID, 'onTabFocus', () => {
      if (that.tabsSVC.isTabDataExpired(that.tabID)) { that.loadPages(); }
    });
    this.loadPages();
  }

  loadPages() {
    const that = this;
    this.backendSVC.getAllPages(true).then(
      (data: any) => {
        that.viewList = data.lstPages;
        that.catTree = data.tree;
        that.setLoading(false);
        that.tabsSVC.setTabDataExpired(that.tabID, false); // mark data of tab as up to date
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading');
        console.log(err);
        that.setLoading(false);
      }
    );
  }
  treeClick(row: any) {
    row.value.expanded = true;
  }

  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }

  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
}
