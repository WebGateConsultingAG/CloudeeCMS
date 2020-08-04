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
import { TabsNavService } from 'src/app/services/tabs.service';
import { FileAdminService } from 'src/app/services/fileadmin.service';

@Component({
  selector: 'app-fileeditor',
  templateUrl: './fileeditor.compo.html'
})

export class FileEditorComponent implements OnInit {
  @Input() docid: string;
  @Input() tabid: string;

  constructor(
    private tabsSVC: TabsNavService,
    private fileSVC: FileAdminService
  ) { }

  loading = true;
  filePath: string;
  fileName: string;
  bucketName: string;
  fileBody: string;
  contentType: string;
  lastModified: string;
  fileLoaded: boolean;
  availableTypes = [
    { label: 'JavaScript', ctype: 'application/javascript' },
    { label: 'CSS', ctype: 'text/css' },
    { label: 'HTML', ctype: 'text/html' },
    { label: 'Markdown .MD', ctype: 'text/markdown' },
    { label: 'Plain Text', ctype: 'text/plain' }
  ];
  ccMaxAge = 'max-age=259200';
  lstCCMaxAge = [
    { label: '1 day', val: 'max-age=86400' },
    { label: '3 days', val: 'max-age=259200' },
    { label: '1 week', val: 'max-age=604800' },
    { label: '1 month', val: 'max-age=2419200' }
  ];

  ngOnInit() {
    const that = this;
    if (this.docid === 'NEW') {
      that.tabsSVC.setTabTitle(this.tabid, 'New File');
      this.loading = false;
      setTimeout(() => { that.setLoading(false); }, 1000); // delay to prevent error
    } else {
      const f = this.docid.split('|');
      this.bucketName = f[0];
      this.filePath = f[1].replace(/\\/g, '/');
      this.fileName = this.filePath.substr(this.filePath.lastIndexOf('/') + 1, this.filePath.length);
      this.loadFileByKey(this.bucketName, this.filePath);
    }
  }

  loadFileByKey(bucket: string, key: string) {
    const that = this;
    this.fileSVC.getFileByKey(bucket, key).then(
      (data: any) => {
        if (data) {
          if (data.success && data.fileObj) {
            that.contentType = data.fileObj.ContentType;
            that.lastModified = data.fileObj.LastModified;
            that.fileBody = data.fileObj.Body.toString();
            if (data.fileObj.CacheControl) { that.ccMaxAge = data.fileObj.CacheControl; }
            that.tabsSVC.setTabTitle(that.tabid, that.fileName || 'Untitled File');
            that.fileLoaded = true;
          } else {
            that.tabsSVC.printNotification('Error while loading file');
          }
        }
        that.setLoading(false);
      },
      (err) => {
        that.tabsSVC.printNotification('Error while loading file');
        that.setLoading(false);
      }
    );
  }

  saveFile() {
    if (!this.filePath || this.filePath === '') {
      alert('File name is required!');
      return;
    }
    this.tabsSVC.setTabTitle(this.tabid, this.fileName || 'Untitled File');
    const that = this;

    const fileInfo = {
      key: this.filePath,
      contentType: this.contentType,
      cacheControl: this.ccMaxAge
    };

    this.setLoading(true);
    this.fileSVC.saveFile(this.bucketName, fileInfo, this.fileBody).then(
      (data: any) => {
        that.setLoading(false);
        // that.tabsSVC.setTabTitle(that.tabid, that.fileName);
        // that.tabsSVC.setTabDataExpired('tab-...', true);
        if (data.success) { that.tabsSVC.printNotification('File saved'); }
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
  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
}
