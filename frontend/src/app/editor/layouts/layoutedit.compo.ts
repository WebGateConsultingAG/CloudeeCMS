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

import { Component, OnInit, Input } from '@angular/core';
import { BackendService } from 'src/app/services/backend.service';
import { Layout } from './layout';
import { MatDialog } from '@angular/material/dialog';
import { LayoutFieldDialogComponent } from './dialogs/layoutfield.dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TabsNavService } from 'src/app/services/tabs.service';

@Component({
  selector: 'app-layoutedit',
  templateUrl: './layoutedit.compo.html'
})

export class LayoutEditComponent implements OnInit {
  @Input() docid: string;
  @Input() tabid: string;

  constructor(
    private tabsSVC: TabsNavService,
    private backendSVC: BackendService,
    public dialog: MatDialog
  ) { }

  loading = true;
  layout: Layout;
  lstAcceptFieldTypes: any = ['text', 'textarea', 'richtext', 'container', 'dropdown', 'checkbox', 'number', 'image'];
  showPugHelp = false;
  hasChanges = false;

  ngOnInit() {
    if (this.docid === 'NEW') {
      this.layout = new Layout();
      this.tabsSVC.setTabTitle(this.tabid, 'New Layout');
      this.loading = false;
      setTimeout(() => { this.setLoading(false); }, 1000); // delay to prevent error
    } else {
      this.loadLayoutByID(this.docid);
    }
  }

  loadLayoutByID(id: string) {
    this.backendSVC.actionContent('getItemByID', { id }).then(
      (data: any) => {
        if (data.success) {
          this.layout = data.item;
          this.tabsSVC.setTabTitle(this.tabid, data.item.title || 'Untitled Layout');
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading');
        }
        this.setLoading(false);
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while loading layout');
        this.setLoading(false);
      }
    );
  }

  saveLayout() {
    if (!this.layout.okey || this.layout.okey === '') {
      alert('Key name is required!');
      return;
    }
    this.setLoading(true);
    this.backendSVC.saveLayout(this.layout).then(
      (data: any) => {
        if (this.layout.id !== data.id) { // first save of NEW doc
          this.tabsSVC.changeTabID(this.tabid, 'tab-layout-' + data.id, data.id);
          this.tabid = 'tab-layout-' + data.id;
          this.docid = data.id;
        }
        this.layout.id = data.id;
        this.setLoading(false);
        this.tabsSVC.setTabTitle(this.tabid, this.layout.title);
        this.tabsSVC.setTabDataExpired('tab-layouts', true);
        if (data.success) {
          this.tabsSVC.printNotification('Document saved');
          this.setHasChanges(false);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while saving');
        }
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while saving layout');
        this.setLoading(false);
      }
    );
  }
  btnAddNewField() {
    const dialogRef = this.dialog.open(LayoutFieldDialogComponent,
      { width: '800px', disableClose: false, data: { isNew: true, accept: this.lstAcceptFieldTypes } }
    );
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'addnew') { this.layout.custFields.push(result.fld); }
    });
    this.setHasChanges(true);
  }
  btnEditField(fld: any) {
    this.dialog.open(LayoutFieldDialogComponent, { width: '800px', disableClose: false, data: { fld, accept: this.lstAcceptFieldTypes } });
    this.setHasChanges(true);
  }
  btnDeleteField(fld) {
    if (!confirm('Do you really want to delete the field \'' + fld.fldName + '\'?')) { return false; }
    for (let i = 0; i < this.layout.custFields.length; i++) {
      if (this.layout.custFields[i] === fld) { this.layout.custFields.splice(i, 1); }
    }
    this.setHasChanges(true);
  }
  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }
  dropSortObj(lst, event: CdkDragDrop<string[]>) {
    moveItemInArray(lst, event.previousIndex, event.currentIndex);
    this.setHasChanges(true);
  }
  btnDelete(): void {
    if (!confirm('Do you really want to delete this object?')) return;
    this.backendSVC.actionContent('deleteItemByID', { id: this.layout.id }).then(
      (data: any) => {
        if (data.success) {
          this.tabsSVC.printNotification('Document deleted');
          this.tabsSVC.setTabDataExpired('tab-layouts', true);
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
