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
import { Page } from './page';
import { MatDialog } from '@angular/material/dialog';
import { PublishDialogComponent } from './dialogs/PublishDialog';
import { MTSelectDialogComponent } from './dialogs/MTSelectDialog';
import { MTContentDialogComponent } from './dialogs/MTContentDialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TabsNavService } from 'src/app/services/tabs.service';
import { environment } from '../../../environments/environment';
import { Auth } from '@aws-amplify/auth';
import { FileSelectionDialogComponent } from './dialogs/FileSelectionDialog';
import { ImgUploadDialogComponent } from '../fileexplorer/imageuploader/ImgUploadDialog';
import { CFInvalidationDialogComponent } from '../publication/dialogs/CFInvalidationDialog';

declare var window: any;

@Component({
  selector: 'app-pageedit',
  templateUrl: './pageedit.compo.html',
  styleUrls: ['./mttable.component.css']
})

export class PageEditComponent implements OnInit {
  @Input() docid: string;
  @Input() tabid: string;

  constructor(
    private tabsSVC: TabsNavService,
    private backendSVC: BackendService,
    public dialog: MatDialog
  ) { }

  loading = true;
  viewList: any = [];
  page: Page = new Page();
  layouts: any = [];
  errorMessage: any;
  custFields: any = [];
  custFieldsReady: boolean;
  config: any;
  pathlist: string[] = [];
  pathlistFilter: string[];
  pathHint = '';
  hasChanges = false;
  editorTrackChanges = false;

  trumbooptions: any = { // any, because of missing "semantic" prop. in ngx-trumbowyg
    lang: 'en',
    svgPath: 'assets/img/trumbowyg-icons.svg',
    semantic: { div: 'div' }, // prevent converting <div> to <p>
    removeformatPasted: true,
    resetCss: true,
    autogrow: true,
    imageWidthModalEdit: true,
    btns: [
      ['formatting'],
      ['fontsize'],
      ['strong', 'em', 'del'],
      ['table'],
      ['link'],
      ['insertImage'], ['cdnplugin'],
      ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
      ['unorderedList', 'orderedList'],
      ['horizontalRule'],
      ['removeformat'],
      ['viewHTML'],
      ['fullscreen']
    ],
    events: {},
    plugins: environment.trumbooptions.plugins
  };

  ngOnInit() {
    // if trumboeditor plugins are enabled, get auth token for uploader
    if (environment.trumbo_load_plugins) {
      // Note: this token will not be refreshed automatically.
      // We might switch to signed S3 upload instead, as we did for ckeditor
      Auth.currentSession()
        .then(data => {
          // TODO: move this to a window.pubfn in app.component.ts function to prevent token from expiring
          this.trumbooptions.plugins.upload.headers.Authorization = data.getIdToken().getJwtToken();
          window.loadTrumboPlugins();
        })
        .catch(err => console.warn('Failed to aquire token for trumbo_uploader_plugin', err));
    }
    this.loadConfig();
    if (this.docid === 'NEW') { this.tabsSVC.setTabTitle(this.tabid, 'New Page'); }
    this.loadPageByID(this.docid);
  }
  loadConfig() {
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        this.config = rc.cfg;
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while loading configuration');
      }
    );
  }
  loadPathList() {
    // Load cached list of already existing paths
    this.backendSVC.getAllPages(false).then(
      (data: any) => {
        if (data.success) {
          this.pathlist = [];
          data.lstPages.forEach(pgEntry => {
            if (pgEntry.id !== this.page.id) { this.pathlist.push(pgEntry.opath); }
          });
          this.pathlist.sort();
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
  loadPageByID(id: string): void {
    this.backendSVC.actionContent('getPageByID', { id }).then(
      (data: any) => {
        if (data.success) {
          this.page = data.item;
          this.layouts = data.layouts;
          if (this.docid === 'NEW') {
            this.tabsSVC.changeTabID(this.tabid, 'tab-page-' + this.page.id, this.page.id);
            this.tabid = 'tab-page-' + this.page.id;
            this.docid = this.page.id;
          }
          this.loadPathList();
          this.tabsSVC.setTabTitle(this.tabid, data.item.title || 'Untitled page');
          if (!this.page.lstMTObj) this.page.lstMTObj = {};
          if (!this.page.doc) this.page.doc = {};
          this.loadCustFields();

          // enable trumbowyg editor onchange tracking
          setTimeout(() => { this.editorTrackChanges = true; }, 2000);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading page');
        }
        this.setLoading(false);
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while loading page');
        this.setLoading(false);
      }
    );
  }
  checkPath(): void {
    this.setHasChanges(true);
    const thisPath = this.page.opath || '';
    if (thisPath !== '') {
      if (thisPath.startsWith('/')) {
        this.pathHint = 'Path can not start with /';
        return;
      } else if (thisPath.indexOf('\\') >= 0) {
        this.pathHint = 'Use forward slashes!';
        return;
      } else if (thisPath.indexOf(' ') >= 0) {
        this.pathHint = 'No spaces allowed in path!';
        return;
      } else if (this.isDuplicatePath(thisPath)) {
        this.pathHint = 'Another page for this path already exists!';
        return;
      }
    }
    this.pathHint = '';
    this.pathlistFilter = this.pathFilter(thisPath);
  }
  isDuplicatePath(thisPath: string): boolean {
    for (const paths in this.pathlist) {
      if (this.pathlist[paths] === thisPath) { return true; }
    }
    return false;
  }
  private pathFilter(value: string): string[] {
    const filterValue = value.toLowerCase();
    if (value === '') { return []; }
    return this.pathlist.filter(option => option.toLowerCase().startsWith(filterValue));
  }
  loadCustFields() {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.layouts.length; i++) {
      if (this.layouts[i].id === this.page.layout) {
        this.custFields = this.layouts[i].custFields;
        this.custFieldsReady = true;
        return;
      }
    }
  }

  onLayoutChange() {
    this.loadCustFields();
    this.setHasChanges(true);
  }

  canPublish() { // toggle publish button visibility
    if (!this.page || this.page.id === '') { return false; }
    if (!this.page.opath || this.page.opath === '') { return false; }
    if (!this.page.layout || this.page.layout === '') { return false; }
    return true;
  }

  savePage() {
    if (this.pathHint !== '') {
      alert(`Please correct the path field:\n${this.pathHint}`);
      return;
    }
    if (!this.page.title || this.page.title === '') {
      alert('You must specify a title for this page');
      return;
    }
    if (!this.page.opath || this.page.opath === '') {
      alert('You must specify a path for this page');
      return;
    }
    this.setLoading(true);
    this.errorMessage = '';
    this.backendSVC.savePage(this.page).then(
      (data: any) => {
        if (data.success) {
          this.page.id = data.id;
          this.tabsSVC.printNotification('Document saved');
          this.setHasChanges(false);
          this.tabsSVC.setTabTitle(this.tabid, this.page.title || 'untitled');
          this.tabsSVC.setTabDataExpired('tab-pages', true);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while saving');
        }

        this.setLoading(false);
      },
      (err: any) => {
        console.error(err);
        this.errorMessage = JSON.stringify(err);
        this.tabsSVC.printNotification('Error while saving');
        this.setLoading(false);
      }
    );
  }

  btnDlgPublish(): void {
    if (!this.page.opath || this.page.opath === '') {
      this.errorMessage = 'Path must be supplied!';
      return;
    }
    if (this.page.opath.startsWith('/') || this.page.opath.startsWith('\\')) {
      this.errorMessage = 'Path can not start with a slash';
      return;
    }
    if (this.page.opath.endsWith('/') || this.page.opath.endsWith('\\')) {
      this.errorMessage = 'Path can not end with a slash';
      return;
    }
    const dialogRef = this.dialog.open(PublishDialogComponent,
      {
        width: '650px', disableClose: false, data: { page: this.page, config: this.config }
      });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'openInvalidationDialog') {
        this.btnOpenCFDialog(result.opaths);
      }
    });
  }
  btnOpenCFDialog(opaths: string[]) {
    if (!this.config.cfdists || this.config.cfdists.length < 1) {
      alert('No CloudFront Distributions configured in settings page.');
      return;
    }
    this.dialog.open(CFInvalidationDialogComponent, {
      width: '450px', disableClose: false,
      data: { cfdists: this.config.cfdists, opaths }
    });
  }
  btnDlgSelectImage(fldName: string): void {
    const dialogRef = this.dialog.open(FileSelectionDialogComponent,
      {
        width: '650px', disableClose: false, data: {
          selectedBucket: 'CDN', dlgTitle: 'Select image', fileFilter: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tif', 'tiff', 'webp']
        }
      }
    );
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'add') {
        this.page.doc[fldName] = result.fileurl;
      }
    });
    this.setHasChanges(true);
  }
  btnDlgSelectCoverImage(): void {
    const dialogRef = this.dialog.open(FileSelectionDialogComponent,
      {
        width: '650px', disableClose: false, data: {
          selectedBucket: 'CDN', dlgTitle: 'Select image', fileFilter: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tif', 'tiff', 'webp']
        }
      }
    );
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'add') {
        this.page.img = result.fileurl;
      }
    });
    this.setHasChanges(true);
  }
  btnAddNewObj(fld: any) {
    const dialogRef = this.dialog.open(MTSelectDialogComponent, { width: '450px', disableClose: false, data: { fld } });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'add') {
        // tslint:disable-next-line: max-line-length
        if (!this.page.lstMTObj[fld.fldName]) { this.page.lstMTObj[fld.fldName] = { fldTitle: fld.fldTitle, fldName: fld.fldName, lstObj: [] }; }
        const selObj = this.page.lstMTObj[fld.fldName];
        selObj.lstObj.push(result.mt);
        this.btnEditObj(result.mt);
      }
    });
    this.setHasChanges(true);
  }
  btnNavigateTo(npath: string): void {
    this.tabsSVC.navigateTo(npath);
  }
  btnEditObj(fldMT) {
    this.dialog.open(MTContentDialogComponent, { width: '800px', disableClose: false, data: { fldMT } });
    this.setHasChanges(true);
  }
  btnDeleteObj(lst, fldMT, idx) {
    if (!confirm('Do you really want to delete \'' + fldMT.title + '\'?')) { return; }
    lst.splice(idx, 1);
    this.setHasChanges(true);
  }
  dropSortObj(lst, event: CdkDragDrop<string[]>) {
    moveItemInArray(lst, event.previousIndex, event.currentIndex);
    this.setHasChanges(true);
  }
  btnDuplicate() {
    if (!confirm('Create a copy of this page?')) return false;
    this.backendSVC.actionContent('duplicatePage', { id: this.page.id }).then(
      (data: any) => {
        if (data.success) {
          this.tabsSVC.printNotification('Document duplicated');
          this.tabsSVC.setTabDataExpired('tab-pages', true);
          this.btnNavigateTo('editor/pages/edit/' + data.newPageID);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while duplicating');
        }
      },
      (err: any) => {
        this.tabsSVC.printNotification('Error while duplicating');
        this.setLoading(false);
      }
    );
  }
  btnDelete(): void {
    if (!confirm('Do you really want to delete this entry from the database?\nNote: this will not remove an already published version.')) return;
    this.backendSVC.actionContent('deleteItemByID', { id: this.page.id }).then(
      (data: any) => {
        if (data.success) {
          this.tabsSVC.printNotification('Document deleted');
          this.tabsSVC.setTabDataExpired('tab-pages', true);
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
  btnShowImageUploadDialog() {
    this.dialog.open(ImgUploadDialogComponent, {
      width: '500px',
      data: { filelist: [], uplPath: null, targetEnv: null, useDefaultUplPath: true }
    });
  }
  setHasChanges(hasChanges): void {
    if (this.hasChanges !== hasChanges) {
      this.tabsSVC.setTabHasChanges(this.tabid, hasChanges);
      this.hasChanges = hasChanges;
    }
  }
  setEditorHasChanges(): void {
    // this event is muted by setTimeout for the first few seconds, because each editor triggers ngModelChange at least 2 times on startup
    // editors own 'onchange' events are unavailable in ngx-trumbowyg wrapper
    if (this.editorTrackChanges) {
      if (this.hasChanges !== true) {
        this.tabsSVC.setTabHasChanges(this.tabid, true);
        this.hasChanges = true;
      }
    }
  }
  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
}
