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

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BackendService } from 'src/app/services/backend.service';
import { versioninfo } from '../../version';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-updater-dialog',
  templateUrl: 'updater-dialog.html',
  styleUrls: ['updater-dialog.css']
})

export class UpdaterDialogComponent implements OnInit {
  constructor(
    private backendSVC: BackendService,
    public dialogRef: MatDialogRef<Component>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  APP_VERSION = versioninfo.version;
  updaterstatus = -1; // 0: no update, 1: update available, 2: update in progress, 3: update completed
  isAdmin = false;
  updaterMessage = '';
  errorMessage = '';
  loading = false;
  updaterData: any;
  updProgress  = { pStatus: null };
  waitForCompletion = false;
  enableOnlineUpdates: boolean;

  ngOnInit(): void {
    this.isAdmin = this.backendSVC.isAdmin;
    this.enableOnlineUpdates = environment.enableOnlineUpdates;
    if (!this.enableOnlineUpdates) {
      this.updaterstatus = 99;
      this.checkPipelineStatus(); // just check if update already in progress
      return;
    }
    this.loading = true;
    const that = this;
    this.backendSVC.checkForUpdates().then(
      (rc: any) => {
        that.updaterstatus = rc.hasUpdate ? 1 : 0;
        that.updaterData = rc;
        that.loading = false;
        that.checkPipelineStatus(); // check if update already in progress
      },
      (err) => {
        console.log('Error while checking for updates', err);
        that.loading = false;
        that.errorMessage = 'Error while checking for updates';
      }
    );
  }
  btnStartUpdate(): void {
    if (!confirm('This will start the application update. Are you sure?')) { return; }
    const that = this;
    this.loading = true;
    this.updaterstatus = -1;
    this.backendSVC.startUpdate().then(
      (rc: any) => {
        that.loading = false;
        if (rc.success) {
          that.updaterstatus = 2; // in progress
          that.waitForCompletion = true; // periodically check pipeline progress and display completed message when done
          // rc.message rc.pStatus
          that.updProgress = rc;
          setTimeout(() => { that.checkPipelineStatus(); }, 30000);
        } else {
          that.errorMessage = rc.message;
        }
      },
      (err) => {
        console.log('Error while starting update', err);
        that.loading = false;
        that.errorMessage = 'Error while starting update';
      }
    );
  }

  checkPipelineStatus(): void {
    const that = this;
    this.backendSVC.getPipelineStatus().then(
      (rc: any) => {
        that.loading = false;
        if (rc.success) {
          that.updProgress.pStatus = rc.pStatus;
          if (rc.running) {
            that.updaterstatus = 2; // in progress
            that.waitForCompletion = true; // show completed message when done
            setTimeout(() => { that.checkPipelineStatus(); }, 15000);
          } else {
            if (that.waitForCompletion) {
              if (rc.failed) {
                that.errorMessage = 'At least one build step has failed';
              } else {
                that.updaterstatus = 3; // if update initiated by user, show update completed msg
              }
            }
          }
        } else {
          that.errorMessage = rc.message;
        }
      },
      (err) => {
        console.log('Error while checking update status', err);
        that.loading = false;
        that.errorMessage = 'Error while checking CodePipeline status';
      }
    );
  }

  btnRestart(): void {
    window.location.reload();
  }

  btnCancel(): void {
    this.dialogRef.close(null);
  }
}
