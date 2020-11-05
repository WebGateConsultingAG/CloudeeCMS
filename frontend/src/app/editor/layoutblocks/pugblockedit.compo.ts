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

import { Component, Input, OnInit } from '@angular/core';
import { BackendService } from 'src/app/services/backend.service';
import { PugBlock } from './PugBlock';
import { TabsNavService } from 'src/app/services/tabs.service';

@Component({
  selector: 'app-blockedit',
  templateUrl: './pugblockedit.compo.html'
})

export class PugBlockEditComponent implements OnInit {
  @Input() docid: string;
  @Input() tabid: string;

  constructor(
    private tabsSVC: TabsNavService,
    private backendSVC: BackendService
  ) { }

  loading = true;
  viewList: any = [];
  block: PugBlock;
  showPugHelp = false;
  hasChanges = false;

  ngOnInit() {
    const that = this;
    if (this.docid === 'NEW') {
      this.block = new PugBlock();
      that.tabsSVC.setTabTitle(this.tabid, 'New Layout Block');
      this.loading = false;
      setTimeout(() => { that.setLoading(false); }, 1000); // delay to prevent error
    } else {
      this.loadBlockByID(this.docid);
    }
  }

  loadBlockByID(id: string) {
    const that = this;
    this.backendSVC.getItemByID(id).then(
      (data: any) => {
        if (data.item) {
          that.block = data.item;
          that.tabsSVC.setTabTitle(that.tabid, data.item.title || 'Untitled');
        }
        that.setLoading(false);
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading');
        that.setLoading(false);
      }
    );
  }

  saveBlock() {
    if (!this.block.okey || this.block.okey === '') {
      alert('Key name is required!');
      return;
    }
    const that = this;
    this.setLoading(true);
    this.backendSVC.saveBlock(this.block).then(
      (data: any) => {
        if (that.block.id !== data.id) { // first save of NEW doc
          that.tabsSVC.changeTabID(that.tabid, 'tab-block-' + data.id, data.id);
          that.tabid = 'tab-block-' + data.id;
          that.docid = data.id;
        }
        that.block.id = data.id;
        that.setLoading(false);
        that.tabsSVC.setTabTitle(that.tabid, that.block.title);
        that.tabsSVC.setTabDataExpired('tab-compos', true);
        if (data.success) {
          that.tabsSVC.printNotification('Document saved');
          that.setHasChanges(false);
        }
      },
      (err) => {
        that.tabsSVC.printNotification('Error while saving');
        that.setLoading(false);
      }
    );
  }
  btnDelete() {
    if (!confirm('Do you really want to delete this object?')) { return false; }
    const that = this;
    this.backendSVC.deleteItemByID(this.block.id).then(
      (data: any) => {
        if (data.success) {
          that.tabsSVC.printNotification('Document deleted');
          that.tabsSVC.setTabDataExpired('tab-compos', true);
          that.tabsSVC.closeTabByID(that.tabid);
        }
      },
      (err) => {
        that.tabsSVC.printNotification('Error while deleting');
        that.setLoading(false);
      }
    );
  }
  btnTogglePugHelp(): void {
    this.showPugHelp = !this.showPugHelp;
  }
  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }
  setHasChanges(hasChanges): void {
    if (this.hasChanges !== hasChanges) {
      this.tabsSVC.setTabHasChanges(this.tabid, hasChanges);
      this.hasChanges = hasChanges;
    }
  }
  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
}
