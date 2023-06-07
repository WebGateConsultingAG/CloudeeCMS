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
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { BackendService } from 'src/app/services/backend.service';
import { versioninfo } from '../../version';
import { environment } from 'src/environments/environment';
import { BuildprojectDialogComponent } from './buildproject-dialog';

@Component({
  selector: 'app-updater-dialog',
  templateUrl: 'updater-dialog.html',
  styleUrls: ['updater-dialog.css']
})

export class UpdaterDialogComponent implements OnInit {
  constructor(
    private backendSVC: BackendService,
    public dialogRef: MatDialogRef<Component>,
    public dialog: MatDialog,
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
  buildinfo: any = {};

  ngOnInit(): void {
    this.isAdmin = this.backendSVC.isAdmin;
    this.enableOnlineUpdates = environment.enableOnlineUpdates;
    setTimeout(() => { this.getBuildProjectInfo(); }, 1200);
    if (!this.enableOnlineUpdates) {
      this.updaterstatus = 99;
      this.checkPipelineStatus(); // just check if update already in progress
      return;
    }
    this.loading = true;
    this.backendSVC.checkForUpdates().then(
      (rc: any) => {
        this.updaterstatus = rc.hasUpdate ? 1 : 0;
        this.updaterData = rc;
        this.loading = false;
        this.checkPipelineStatus(); // check if update already in progress
      },
      (err) => {
        console.log('Error while checking for updates', err);
        this.loading = false;
        this.errorMessage = 'Error while checking for updates';
      }
    );
  }
  btnStartUpdate(): void {
    if (!confirm('This will start the application update. Are you sure?')) { return; }
    this.loading = true;
    this.updaterstatus = -1;
    this.backendSVC.startUpdate().then(
      (rc: any) => {
        this.loading = false;
        if (rc.success) {
          this.updaterstatus = 2; // in progress
          this.waitForCompletion = true; // periodically check pipeline progress and display completed message when done
          this.updProgress = rc;
          setTimeout(() => { this.checkPipelineStatus(); }, 30000);
        } else {
          this.errorMessage = rc.message;
        }
      },
      (err: any) => {
        console.log('Error while starting update', err);
        this.loading = false;
        this.errorMessage = 'Error while starting update';
      }
    );
  }

  checkPipelineStatus(): void {
    this.backendSVC.getPipelineStatus().then(
      (rc: any) => {
        this.loading = false;
        if (rc.success) {
          this.updProgress.pStatus = rc.pStatus;
          if (rc.running) {
            this.updaterstatus = 2; // in progress
            this.waitForCompletion = true; // show completed message when done
            setTimeout(() => { this.checkPipelineStatus(); }, 15000);
          } else {
            if (this.waitForCompletion) {
              if (rc.failed) {
                this.errorMessage = 'At least one build step has failed';
              } else {
                this.updaterstatus = 3; // if update initiated by user, show update completed msg
              }
            }
          }
        } else {
          this.errorMessage = rc.message;
        }
      },
      (err: any) => {
        console.log('Error while checking update status', err);
        this.loading = false;
        this.errorMessage = 'Error while checking CodePipeline status';
      }
    );
  }
  getBuildProjectInfo(): void {
    this.backendSVC.actionBkup('getbuildprojectinfo', {}).then(
      (rc: any) => {
        let data = rc.data; // for backwards compatibility
        if (data.success) {
          console.log(data.buildinfo);
          this.buildinfo = data.buildinfo || {};
        } else {
          console.log("Error while retrieving buildproject info:", data.message);
        }
      },
      (err: any) => {
        console.log('Error while fetching buildproject information', err);
      }
    );
  }
  btnRestart(): void {
    window.location.reload();
  }

  btnCancel(): void {
    this.dialogRef.close(null);
  }
  btnShowBuildInfoDialog(): void {
    this.dialog.open(BuildprojectDialogComponent, { width: '800px', disableClose: false });
  }
}
