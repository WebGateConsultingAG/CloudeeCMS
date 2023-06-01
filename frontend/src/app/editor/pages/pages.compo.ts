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
    this.tabsSVC.addTabEvent(this.tabID, 'onTabFocus', () => {
      if (this.tabsSVC.isTabDataExpired(this.tabID)) this.loadPages(true);
    });
    this.loadPages(false);
  }

  loadPages(forceUpdate: boolean) {
    this.backendSVC.getAllPages(forceUpdate).then(
      (data: any) => {
        if (data.success) {
          this.viewList = data.lstPages;
          this.catTree = data.tree;
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
