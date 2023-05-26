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
import { FileAdminService } from 'src/app/services/fileadmin.service';
import { FileUploadDialogComponent } from './fileuploader/FileUploadDialog';
import { MatDialog } from '@angular/material/dialog';
import { TabsNavService } from 'src/app/services/tabs.service';
import { BackendService } from 'src/app/services/backend.service';
import { ImgUploadDialogComponent } from './imageuploader/ImgUploadDialog';
import { CFInvalidationDialogComponent } from '../publication/dialogs/CFInvalidationDialog';

@Component({
  selector: 'app-listfiles',
  templateUrl: './listfiles.compo.html',
  styleUrls: ['./listfiles.compo.css']
})

export class ListFilesComponent implements OnInit {

  loading = false;
  selectedBucket = '';
  viewList: any = [];
  currentKey = '';
  showListing = false;
  config: any;
  configLoaded: boolean;
  cdnURL: string;
  selectAll: boolean;

  constructor(
    private tabsSVC: TabsNavService,
    private fileSVC: FileAdminService,
    private backendSVC: BackendService,
    public dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadBucket(): void {
    if (!this.selectedBucket || this.selectedBucket === '') { return; }
    this.listFiles('');
  }

  listFiles(strPath: string): void {
    this.setLoading(true);
    this.showListing = false;
    const bucketConfig = this.getBucketConfig(this.selectedBucket);
    const bucketURL: string = (bucketConfig ? bucketConfig.webURL || '' : '');
    this.cdnURL = (bucketConfig ? bucketConfig.cdnURL || '' : '');
    this.fileSVC.fileAdminAction('listFiles', { bucketName: this.selectedBucket, bucketURL, path: strPath }).then(
      (data: any) => {
        if (data.success) {
          this.viewList = data.lstFiles;
          this.currentKey = strPath;
          this.showListing = true;
          this.selectAll = false;
          this.setSelectAll();
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading files');
        }
        this.setLoading(false);
      },
      (err) => {
        this.tabsSVC.printNotification('Error while loading files');
        console.error(err);
        this.setLoading(false);
      }
    );
  }
  getBucketConfig(bucketName: string): any {
    for (let i = 0; i < this.config.buckets.length; i++) { if (this.config.buckets[i].bucketname === bucketName) { return this.config.buckets[i]; } }
    return null;
  }
  openParentFolder(): void {
    if (this.currentKey === '') { return; }
    const tmp = this.currentKey.split('/');
    let newKey = '';
    for (let i = 0; i < tmp.length - 2; i++) { newKey += tmp[i] + '/'; }
    this.listFiles(newKey);
  }
  openItem(itm): void {
    if (itm.otype === 'Folder') {
      this.listFiles(itm.Key);
    } else if (itm.otype === 'File') {
      alert(itm.Key);
    }
  }
  editItem(itm): void {
    const fName = itm.Key.replace(/\//g, '\\');
    this.tabsSVC.navigateTo('editor/files/edit/' + this.selectedBucket + '|' + fName);
  }
  deleteItem(itm: any): void {
    if (itm.otype === 'File') {
      if (!confirm(itm.Key + '\nDo you really want to delete this file?')) return;
    } else {
      if (!confirm(itm.Key + '\nNote: Folders must be empty before you can delete them.\nDo you really want to delete this folder?')) return;
    }
    this.setLoading(true);
    this.fileSVC.fileAdminAction('deleteFile', { bucketName: this.selectedBucket, key: itm.Key }).then(
      (data: any) => {
        if (data.success) {
          this.listFiles(this.currentKey);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while deleting file');
          this.setLoading(false);
        }
      },
      (err) => {
        this.tabsSVC.printNotification('Error while deleting file');
        console.error(err);
        this.setLoading(false);
      }
    );
  }
  btnBatchDeleteFiles(): void {
    const lstKeys = [];
    this.viewList.forEach(f => {
      if (f.otype === 'File' && f.sel) { lstKeys.push(f.Key); }
    });
    if (lstKeys.length < 1) return;
    if (!confirm('Do you really want to delete all selected files?')) return;
    this.setLoading(true);
    this.fileSVC.fileAdminAction('batchDeleteFiles', { bucketName: this.selectedBucket, lstKeys }).then(
      (data: any) => {
        if (data.success) {
          this.listFiles(this.currentKey);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while deleting files');
          this.setLoading(false);
        }
      },
      (err) => {
        this.tabsSVC.printNotification('Error while deleting file');
        console.error(err);
        this.setLoading(false);
      }
    );
  }
  setSelectAll(): void {
    if (!this.viewList || this.viewList.length < 1) { return; }
    this.viewList.forEach(pg => {
      if (pg.otype === 'File') { pg.sel = this.selectAll; }
    });
  }
  toKB(v: any): any {
    return Math.round((v / 1024));
  }
  btnReloadDirectory(): void {
    this.listFiles(this.currentKey);
  }
  btnCreateNewFolder(): void {
    const folderName = prompt('Enter name of new folder', '');
    if (!folderName || folderName === '') { return; }

    // check if another entry with same name already exists
    for (let f = 0; f < this.viewList.length; f++) {
      if (this.viewList[f].label === folderName) {
        alert('An object with that name already exists!');
        return;
      }
    }

    const newFolderKey = this.currentKey + folderName + '/';
    this.setLoading(true);
    this.fileSVC.fileAdminAction('createFolder', { bucketName: this.selectedBucket, key: newFolderKey }).then(
      (data: any) => {
        if (data.success) {
          this.listFiles(this.currentKey);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while creating folder');
          this.setLoading(false);
        }
      },
      (err) => {
        this.tabsSVC.printNotification('Error while creating folder');
        console.error(err);
        this.setLoading(false);
      }
    );
  }
  btnShowFileUploadDialog(uplPath: string): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '500px',
      data: { filelist: [], uplPath, targetEnv: this.selectedBucket }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.reload) { this.listFiles(this.currentKey); }
    });
  }
  btnShowImageUploadDialog(uplPath: string): void {
    const dialogRef = this.dialog.open(ImgUploadDialogComponent, {
      width: '500px',
      data: { filelist: [], uplPath, targetEnv: this.selectedBucket, useDefaultUplPath: false }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.reload) { this.listFiles(this.currentKey); }
    });
  }
  setLoading(on: boolean): void {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }

  loadConfig(): void {
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        this.config = rc.cfg;
        this.configLoaded = true;
        this.tabsSVC.setLoading(false);
        // open default CDN bucket
        const cdnBucket = this.getBucketByLabel('CDN');
        if (cdnBucket) {
          this.selectedBucket = cdnBucket.bucketname;
          this.listFiles('');
        }
      },
      (err) => {
        console.log('Error while loading', err);
      }
    );
  }
  getBucketByLabel(bLabel: string): any {
    for (let i = 0; i < this.config.buckets.length; i++) {
      if (this.config.buckets[i].label === bLabel) {
        return this.config.buckets[i];
      }
    }
  }
  btnInvalidateSelected(): void {
    const lstKeys = [];
    this.viewList.forEach(f => {
      if (f.otype === 'File' && f.sel) { lstKeys.push('/' + f.Key); }
    });
    if (lstKeys.length < 1) { return; }
    this.btnOpenCFDialog(lstKeys);
  }
  btnOpenCFDialog(opaths): void {
    if (!this.config.cfdists || this.config.cfdists.length < 1) {
      alert('No CloudFront Distributions configured in settings page.');
      return;
    }
    this.dialog.open(CFInvalidationDialogComponent, {
      width: '450px', disableClose: false,
      data: { cfdists: this.config.cfdists, opaths }
    });
  }
}
