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
import { MicroTemplate } from './MicroTemplate';
import { MatDialog } from '@angular/material/dialog';
import { LayoutFieldDialogComponent } from '../layouts/dialogs/layoutfield.dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TabsNavService } from 'src/app/services/tabs.service';
import { IconSelectDialogComponent } from './dialogs/IconSelectDialog';

@Component({
  selector: 'app-mtedit',
  templateUrl: './mtedit.compo.html',
  styles: ['.icon-sel-btn:hover { color: red; }']
})

export class MTEditComponent implements OnInit {
  @Input() docid: string;
  @Input() tabid: string;

  constructor(
    private tabsSVC: TabsNavService,
    private backendSVC: BackendService,
    public dialog: MatDialog
  ) { }

  loading = true;
  mt: MicroTemplate;
  lstAcceptFieldTypes: any = ['text', 'textarea', 'checkbox', 'dropdown', 'number', 'container', 'richtext', 'image'];
  showPugHelp = false;
  showUsageBox = false;
  lstPagesInUse = [];
  hasChanges = false;

  ngOnInit() {
    if (this.docid === 'NEW') {
      this.mt = new MicroTemplate();
      this.tabsSVC.setTabTitle(this.tabid, 'New Microtemplate');
      this.loading = false;
      setTimeout(() => { this.setLoading(false); }, 1000); // delay to prevent error
    } else {
      this.loadMTByID(this.docid);
    }
  }

  loadMTByID(id: string) {
    this.backendSVC.actionContent('getItemByID', { id }).then(
      (data: any) => {
        if (data.success) {
          this.mt = data.item;
          this.tabsSVC.setTabTitle(this.tabid, data.item.title || 'Untitled MT');
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading');
        }
        this.setLoading(false);
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while loading');
        this.setLoading(false);
      }
    );
  }

  saveDocument() {
    this.setLoading(true);
    this.backendSVC.saveMicroTemplate(this.mt).then(
      (data: any) => {
        if (this.mt.id !== data.id) { // first save of NEW doc
          this.tabsSVC.changeTabID(this.tabid, 'tab-mt-' + data.id, data.id);
          this.tabid = 'tab-mt-' + data.id;
          this.docid = data.id;
        }
        this.mt.id = data.id;
        this.setLoading(false);
        this.tabsSVC.setTabTitle(this.tabid, this.mt.title);
        this.tabsSVC.setTabDataExpired('tab-mtlist', true);
        if (data.success) {
          this.tabsSVC.printNotification('Document saved');
          this.setHasChanges(false);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while saving');
        }
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while saving');
        this.setLoading(false);
      }
    );
  }
  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }

  btnAddNewField() {
    const that = this;
    const dialogRef = this.dialog.open(LayoutFieldDialogComponent,
      { width: '800px', disableClose: false, data: { isNew: true, accept: this.lstAcceptFieldTypes } }
    );
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'addnew') { that.mt.custFields.push(result.fld); }
    });
    that.setHasChanges(true);
  }
  btnEditField(fld) {
    this.dialog.open(LayoutFieldDialogComponent, { width: '800px', disableClose: false, data: { fld, accept: this.lstAcceptFieldTypes } });
    this.setHasChanges(true);
  }
  btnDeleteField(fld) {
    if (!confirm('Do you really want to delete the field \'' + fld.fldName + '\'?')) { return false; }
    for (let i = 0; i < this.mt.custFields.length; i++) {
      if (this.mt.custFields[i] === fld) { this.mt.custFields.splice(i, 1); }
    }
    this.setHasChanges(true);
  }
  btnDelete() {
    if (!confirm('Do you really want to delete this object?')) { return false; }
    this.backendSVC.actionContent('deleteItemByID', { id: this.mt.id }).then(
      (data: any) => {
        if (data.success) {
          this.tabsSVC.printNotification('Document deleted');
          this.tabsSVC.setTabDataExpired('tab-mtlist', true);
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
  dropSortObj(lst: any, event: CdkDragDrop<string[]>) {
    moveItemInArray(lst, event.previousIndex, event.currentIndex);
    this.setHasChanges(true);
  }
  btnTogglePugHelp(): void {
    this.showPugHelp = !this.showPugHelp;
  }
  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
  btnCheckUsage(): void {
    this.lstPagesInUse = [];
    this.showUsageBox = true;
    this.setLoading(true);
    // Get a list of pages that use this microtemplate
    this.backendSVC.actionContent('getAllPagesByMT', { mtid: this.mt.id }).then(
      (data: any) => {
        if (data.success) {
          if (data.lstPages) this.lstPagesInUse = data.lstPages;
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while retrieving list of MicroTemplates in use.');
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
  btnDlgSelectIcon(): void {
    const dialogRef = this.dialog.open(IconSelectDialogComponent,
      { width: '600px', disableClose: false, data: { selectionText: 'Select icon to display in Micro Template selection dialogs.' } }
    );
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'add') {
        this.mt.icon = result.icon;
        this.setHasChanges(true);
      }
    });
  }
  setHasChanges(hasChanges): void {
    if (this.hasChanges !== hasChanges) {
      this.tabsSVC.setTabHasChanges(this.tabid, hasChanges);
      this.hasChanges = hasChanges;
    }
  }
}
