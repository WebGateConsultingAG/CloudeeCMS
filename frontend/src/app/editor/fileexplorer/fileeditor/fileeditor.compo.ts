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
import { MatDialog } from '@angular/material/dialog';
import { CFInvalidationDialogComponent } from '../../publication/dialogs/CFInvalidationDialog';
import { BackendService } from 'src/app/services/backend.service';

@Component({
  selector: 'app-fileeditor',
  templateUrl: './fileeditor.compo.html'
})

export class FileEditorComponent implements OnInit {
  @Input() docid: string;
  @Input() tabid: string;

  constructor(
    private tabsSVC: TabsNavService,
    private fileSVC: FileAdminService,
    private backendSVC: BackendService,
    public dialog: MatDialog
  ) { }

  loading = true;
  hasChanges = false;
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
  config: any;

  ngOnInit() {
    this.loadConfig();
    if (this.docid === 'NEW') {
      this.tabsSVC.setTabTitle(this.tabid, 'New File');
      this.loading = false;
      setTimeout(() => { this.setLoading(false); }, 1000); // delay to prevent error
    } else {
      const f = this.docid.split('|');
      this.bucketName = f[0];
      this.filePath = f[1].replace(/\\/g, '/');
      this.fileName = this.filePath.substr(this.filePath.lastIndexOf('/') + 1, this.filePath.length);
      this.loadFileByKey(this.bucketName, this.filePath);
    }
  }
  loadConfig(): void {
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        this.config = rc.cfg;
      },
      (err) => {
        this.tabsSVC.printNotification('Error while loading configuration');
      }
    );
  }
  loadFileByKey(bucketName: string, key: string) {
    this.fileSVC.fileAdminAction('getFile', { bucketName, key }).then(
      (data: any) => {
        if (data.success) {
          this.contentType = data.fileObj.ContentType;
          this.lastModified = data.fileObj.LastModified;
          this.fileBody = data.fileObj.Body.toString();
          if (data.fileObj.CacheControl) { this.ccMaxAge = data.fileObj.CacheControl; }
          this.tabsSVC.setTabTitle(this.tabid, this.fileName || 'Untitled File');
          this.fileLoaded = true;
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading file');
        }
        this.setLoading(false);
      },
      (err) => {
        this.tabsSVC.printNotification('Error while loading file');
        this.setLoading(false);
      }
    );
  }

  saveFile(): void {
    if (!this.filePath || this.filePath === '') {
      alert('File name is required!');
      return;
    }
    this.tabsSVC.setTabTitle(this.tabid, this.fileName || 'Untitled File');
    const fileInfo = {
      key: this.filePath,
      contentType: this.contentType,
      cacheControl: this.ccMaxAge
    };

    this.setLoading(true);
    // Note: saveFile currently passes file contents from Lambda through API-GW. 
    // This could be changed to S3 presigned POST.
    this.fileSVC.fileAdminAction('saveFile', { bucketName: this.bucketName, fileInfo, fileBody: this.fileBody }).then(
      (data: any) => {
        this.setLoading(false);
        if (data.success) {
          this.tabsSVC.printNotification('File saved');
          this.setHasChanges(false);
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while saving');
        }
      },
      (err) => {
        this.tabsSVC.printNotification('Error while saving');
        this.setLoading(false);
      }
    );
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
  setLoading(on: boolean): void {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
  btnOpenCFDialog(): void {
    if (!this.config.cfdists || this.config.cfdists.length < 1) {
      alert('No CloudFront Distributions configured in settings page.');
      return;
    }
    let opaths = ['/' + this.filePath];
    this.dialog.open(CFInvalidationDialogComponent, {
      width: '450px', disableClose: false,
      data: { cfdists: this.config.cfdists, opaths }
    });
  }
}
