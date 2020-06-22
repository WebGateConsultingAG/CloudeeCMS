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

import { Component, OnInit, Inject } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-newuserprofile',
  templateUrl: './newuserprofile.dialog.html'
})

export class NewUserProfileDialogComponent implements OnInit {

  constructor(
    private backendSVC: BackendService,
    public dialogRef: MatDialogRef<Component>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }


  loading: boolean;
  usr: any = {};
  errorMessage: string;
  regDone: boolean;
  tempPwd: string;

  ngOnInit() {
  }

  btnCreateUser() {
    const that = this;
    that.loading = true;
    this.backendSVC.createCognitoUser(this.usr).then(
      (data: any) => {
        that.loading = false;
        if (data.success) {
          that.regDone = true;
          that.tempPwd = data.tempPwd;
        } else {
          that.errorMessage = data.message.message;
        }
      },
      (err) => {
        that.loading = false;
        console.error('Error', err);
        that.errorMessage = 'Failed to create user';
      }
    );
  }

  btnClose(refreshView: boolean) {
    if (refreshView) {
      this.dialogRef.close({ action: 'refreshview' });
    } else {
      this.dialogRef.close(null);
    }
  }
}
