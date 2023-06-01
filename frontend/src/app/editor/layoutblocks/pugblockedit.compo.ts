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
    if (this.docid === 'NEW') {
      this.block = new PugBlock();
      this.tabsSVC.setTabTitle(this.tabid, 'New Layout Block');
      this.loading = false;
      setTimeout(() => { this.setLoading(false); }, 1000); // delay to prevent error
    } else {
      this.loadBlockByID(this.docid);
    }
  }

  loadBlockByID(id: string) {
    this.backendSVC.actionContent('getItemByID', { id }).then(
      (data: any) => {
        if (data.success) {
          this.block = data.item;
          this.tabsSVC.setTabTitle(this.tabid, data.item.title || 'Untitled');
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading');
        }
        this.setLoading(false);
      },
      (err) => {
        this.tabsSVC.printNotification('Error while loading');
        this.setLoading(false);
      }
    );
  }

  saveBlock() {
    if (!this.block.okey || this.block.okey === '') {
      alert('Key name is required!');
      return;
    }
    this.setLoading(true);
    this.backendSVC.saveBlock(this.block).then(
      (data: any) => {
        if (data.success) {
          if (this.block.id !== data.id) { // first save of NEW doc
            this.tabsSVC.changeTabID(this.tabid, 'tab-block-' + data.id, data.id);
            this.tabid = 'tab-block-' + data.id;
            this.docid = data.id;
          }
          this.block.id = data.id;
          this.tabsSVC.setTabTitle(this.tabid, this.block.title);
          this.tabsSVC.setTabDataExpired('tab-compos', true);

          this.tabsSVC.printNotification('Document saved');
          this.setHasChanges(false);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while saving');
        }
        this.setLoading(false);
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while saving');
        this.setLoading(false);
      }
    );
  }
  btnDelete() {
    if (!confirm('Do you really want to delete this object?')) return false;
    this.backendSVC.actionContent('deleteItemByID', { id: this.block.id }).then(
      (data: any) => {
        if (data.success) {
          this.tabsSVC.printNotification('Document deleted');
          this.tabsSVC.setTabDataExpired('tab-compos', true);
          this.tabsSVC.closeTabByID(this.tabid);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while deleting');
        }
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while deleting');
        this.setLoading(false);
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
