/*
 * Copyright WebGate Consulting AG, 2024
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
import { MatDialogRef } from '@angular/material/dialog';
import { BackendService } from 'src/app/services/backend.service';

@Component({
  templateUrl: 'migration-dialog.html',
  styles: ['.logo { width: 145px; float: right; } .warn { padding: 12px; border-radius: 4px; background-color: #ffc275; } a, a:visited { color: #3a77c0; text-decoration: underline; } ']
})

export class MigrationDialogComponent implements OnInit {
  constructor(
    private backendSVC: BackendService,
    public dialogRef: MatDialogRef<Component>) { }

  errorMessage = '';
  loading = true;
  migstatus: any = {};
  showMigResult = false;
  lstMigResult: Array<any> = [];

  ngOnInit(): void {
    this.getGSI1Status();
  }
  getGSI1Status(): void {
    this.loading = true;
    this.backendSVC.migrationAction('getGSI1Status', {}).then(
      (rc: any) => {
        if (rc.success) this.migstatus = rc;
        this.loading = false;
      },
      (err: any) => {
        this.errorMessage = 'Error while checking GSI1-Status';
        console.error(err);
      }
    );
  }
  btnStartUpgrade(): void {
    if (!confirm('Start content migration to support GSI queries?')) return;
    this.loading = true;
    this.backendSVC.migrationAction('migrateGSI1', {}).then(
      (rc: any) => {
        if (rc.success) {
          this.lstMigResult = rc.lst || [];
          this.showMigResult = true;
          this.getGSI1Status();
        } else {
          this.errorMessage = rc.message || 'Upgrade failed';
        }
        this.loading = false;
      },
      (err: any) => {
        this.errorMessage = 'Error while performing update';
        console.error(err);
      }
    );
  }
  btnCancel(): void {
    if (this.showMigResult) {
      // if migration lambda was triggered, reload app to prevent user from saving the currently open settings document, or the GSI1MigDone flag might be lost
      window.location.reload();
    } else {
      this.dialogRef.close(null);
    }
  }
}
