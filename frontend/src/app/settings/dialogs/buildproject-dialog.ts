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
import { MatDialogRef } from '@angular/material/dialog';
import { BackendService } from 'src/app/services/backend.service';

@Component({
  templateUrl: 'buildproject-dialog.html',
  styles: ['.logo { width: 145px; float: right; } .warn { padding: 12px; border-radius: 4px; background-color: #ffc275; } a, a:visited { color: #3a77c0; text-decoration: underline; } ']
})

export class BuildprojectDialogComponent implements OnInit {
  constructor(
    private backendSVC: BackendService,
    public dialogRef: MatDialogRef<Component>) { }

  errorMessage = '';
  loading = true;
  buildinfo = {};

  ngOnInit(): void {
    this.getBuildProjectInfo();
  }
  getBuildProjectInfo(): void {
    this.loading = true;
    this.backendSVC.actionBkup('getbuildprojectinfo', {}).then(
      (rc: any) => {
        if (rc.success) {
          this.buildinfo = rc.buildinfo || {};
          this.loading = false;
        } else {
          console.log("Error while retrieving buildproject info:", rc.message);
          this.errorMessage = "Error while retrieving buildproject info: " + (rc.message || '');
          this.loading = false;
        }
      },
      (err: any) => {
        console.log('Error while fetching buildproject information', err);
        this.errorMessage = 'Error while fetching buildproject information';
        this.loading = false;
      }
    );
  }
  btnCancel(): void {
    this.dialogRef.close(null);
  }
}
