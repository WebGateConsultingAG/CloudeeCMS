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
  constructor(
    private tabsSVC: TabsNavService,
    private fileSVC: FileAdminService,
    private backendSVC: BackendService,
    public dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.loadConfig();
  }

  loadBucket() {
    if (!this.selectedBucket || this.selectedBucket === '') { return; }
    this.listFiles('');
  }

  listFiles(strPath: string) {
    const that = this;
    this.setLoading(true);
    this.showListing = false;
    const bucketConfig = this.getBucketConfig(this.selectedBucket);
    const bucketURL: string = (bucketConfig ? bucketConfig.webURL || '' : '');
    this.cdnURL = (bucketConfig ? bucketConfig.cdnURL || '' : '');
    this.fileSVC.listFiles(this.selectedBucket, bucketURL, strPath).then(
      (data: any) => {
        that.viewList = data.lstFiles;
        that.currentKey = strPath;
        that.showListing = true;
        that.setLoading(false);
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading files');
        console.error(err);
        that.setLoading(false);
      }
    );
  }
  getBucketConfig(bucketName: string) {
    // tslint:disable-next-line: max-line-length prefer-for-of
    for (let i = 0; i < this.config.buckets.length; i++) { if (this.config.buckets[i].bucketname === bucketName) { return this.config.buckets[i]; } }
    return null;
  }
  openParentFolder() {
    if (this.currentKey === '') { return; }
    const tmp = this.currentKey.split('/');
    let newKey = '';
    for (let i = 0; i < tmp.length - 2; i++) { newKey += tmp[i] + '/'; }
    this.listFiles(newKey);
  }
  openItem(itm) {
    if (itm.otype === 'Folder') {
      this.listFiles(itm.Key);
    } else if (itm.otype === 'File') {
      alert(itm.Key);
    }
  }
  editItem(itm) {
    const fName = itm.Key.replace(/\//g, '\\');
    this.tabsSVC.navigateTo('editor/files/edit/' + this.selectedBucket + '|' + fName);
  }
  deleteItem(itm) {
    if (itm.otype === 'File') {
      if (!confirm(itm.Key + '\nDo you really want to delete this file?')) { return; }
    } else {
      // tslint:disable-next-line: max-line-length
      if (!confirm(itm.Key + '\nNote: Folders must be empty before you can delete them.\nDo you really want to delete this folder?')) { return; }
    }
    const that = this;
    this.setLoading(true);
    this.fileSVC.deleteFile(this.selectedBucket, itm.Key).then(
      (data: any) => {
        that.listFiles(that.currentKey);
      },
      (err) => {
        that.tabsSVC.printNotification('Error while deleting file');
        console.error(err);
        that.setLoading(false);
      }
    );
  }
  toKB(v: any) {
    return Math.round((v / 1024));
  }
  btnReloadDirectory() {
    this.listFiles(this.currentKey);
  }
  btnCreateNewFolder() {
    const folderName = prompt('Enter name of new folder', '');
    if (!folderName || folderName === '') { return; }

    // check if another entry with same name already exists
    // tslint:disable-next-line: prefer-for-of
    for (let f = 0; f < this.viewList.length; f++) {
      if (this.viewList[f].label === folderName) {
        alert('An object with that name already exists!');
        return;
      }
    }

    const newFolderKey = this.currentKey + folderName + '/';
    const that = this;
    this.setLoading(true);
    this.fileSVC.createFolder(this.selectedBucket, newFolderKey).then(
      (data: any) => {
        that.listFiles(that.currentKey);
      },
      (err) => {
        that.tabsSVC.printNotification('Error while creating folder');
        console.error(err);
        that.setLoading(false);
      }
    );
  }
  btnShowFileUploadDialog(uplPath: string) {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '500px',
      data: { filelist: [], uplPath, targetEnv: this.selectedBucket }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.reload) { this.listFiles(this.currentKey); }
    });
  }

  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }

  loadConfig() {
    const that = this;
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        that.config = rc.cfg;
        that.configLoaded = true;
        that.tabsSVC.setLoading(false);
        // open default CDN bucket
        const cdnBucket = that.getBucketByLabel('CDN');
        if (cdnBucket) {
          that.selectedBucket = cdnBucket.bucketname;
          that.listFiles('');
        }
      },
      (err) => {
        console.log('Error while loading', err);
      }
    );
  }
  getBucketByLabel(bLabel: string): any {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.config.buckets.length; i++) {
      if (this.config.buckets[i].label === bLabel) {
        return this.config.buckets[i];
      }
    }
  }

}
