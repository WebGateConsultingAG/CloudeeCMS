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
import { TabsNavService } from '../services/tabs.service';
import { MatDialog } from '@angular/material/dialog';
import { PasswordChangeDialogComponent } from './dialogs/pwdchange-dialog';
import { Auth } from 'aws-amplify';

@Component({
  selector: 'app-myprofile',
  templateUrl: './myprofile.compo.html'
})

export class MyProfileComponent implements OnInit {

  constructor(
    private tabsSVC: TabsNavService,
    public dialog: MatDialog
  ) { }

  loading: boolean;
  userLoaded: boolean;
  errorMessage: string;
  userData: any;

  ngOnInit() {
    Auth.currentAuthenticatedUser().then(data => {
      console.log('user', data);
      this.userData = data;
      this.setLoading(false);
      this.userLoaded = true;
    }).catch(err => {
      this.setLoading(false);
      this.errorMessage = err.message || 'Error while loading user data';
    });
  }

  btnChangePassword() {
    const dialogRef = this.dialog.open(PasswordChangeDialogComponent, { width: '450px', disableClose: true, data: {} });

    dialogRef.afterClosed().subscribe(result => {
      if (!result || !result.action || result.action === 'close') { return; }
      if (result.action === 'success') {
        console.log('Reloading window after login');
        window.location.reload();
      }
    });
  }

  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
}
