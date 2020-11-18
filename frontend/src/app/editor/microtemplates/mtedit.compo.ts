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
import { MatDialog } from '@angular/material';
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
    const that = this;
    if (this.docid === 'NEW') {
      this.mt = new MicroTemplate();
      that.tabsSVC.setTabTitle(that.tabid, 'New Microtemplate');
      this.loading = false;
      setTimeout(() => { that.setLoading(false); }, 1000); // delay to prevent error
    } else {
      this.loadMTByID(this.docid);
    }
  }

  loadMTByID(id: string) {
    const that = this;
    this.backendSVC.getItemByID(id).then(
      (data: any) => {
        if (data.item) {
          that.mt = data.item;
          that.tabsSVC.setTabTitle(that.tabid, data.item.title || 'Untitled MT');
        }
        that.setLoading(false);
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading');
        that.setLoading(false);
      }
    );
  }

  saveDocument() {
    const that = this;
    this.setLoading(true);
    this.backendSVC.saveMicroTemplate(this.mt).then(
      (data: any) => {
        if (that.mt.id !== data.id) { // first save of NEW doc
          that.tabsSVC.changeTabID(that.tabid, 'tab-mt-' + data.id, data.id);
          that.tabid = 'tab-mt-' + data.id;
          that.docid = data.id;
        }
        that.mt.id = data.id;
        that.setLoading(false);
        that.tabsSVC.setTabTitle(that.tabid, that.mt.title);
        that.tabsSVC.setTabDataExpired('tab-mtlist', true);
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
    const that = this;
    this.backendSVC.deleteItemByID(this.mt.id).then(
      (data: any) => {
        if (data.success) {
          that.tabsSVC.printNotification('Document deleted');
          that.tabsSVC.setTabDataExpired('tab-mtlist', true);
          that.tabsSVC.closeTabByID(that.tabid);
        }
      },
      (err) => {
        that.tabsSVC.printNotification('Error while deleting');
        that.setLoading(false);
      }
    );
  }
  dropSortObj(lst, event: CdkDragDrop<string[]>) {
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
    const that = this;
    this.lstPagesInUse = [];
    this.showUsageBox = true;
    this.setLoading(true);
    // Get a list of pages that use this microtemplate
    this.backendSVC.getAllPagesByMT(this.mt.id).then(
      (data: any) => {
        that.setLoading(false);
        if (data.lstPages) {
          that.lstPagesInUse = data.lstPages;
        }
      },
      (err) => {
        that.tabsSVC.printNotification('Error while retrieving list of MicroTemplates in use.');
        console.log(err);
        that.setLoading(false);
      }
    );
  }
  btnDlgSelectIcon(): void {
    const that = this;
    const dialogRef = this.dialog.open(IconSelectDialogComponent,
      { width: '600px', disableClose: false, data: { selectionText: 'Select icon to display in Micro Template selection dialogs.' } }
    );
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'add') {
        that.mt.icon = result.icon;
        that.setHasChanges(true);
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
