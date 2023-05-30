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
import { BackendService } from '../services/backend.service';
import { TabsNavService } from '../services/tabs.service';
import { MatDialog } from '@angular/material/dialog';
import { UserProfileDialogComponent } from './dialogs/userprofile.dialog';
import { NewUserProfileDialogComponent } from './dialogs/newuserprofile.dialog';

@Component({
  selector: 'app-userlist',
  templateUrl: './userlist.compo.html'
})

export class UserListComponent implements OnInit {

  constructor(
    private backendSVC: BackendService,
    public tabsSVC: TabsNavService,
    private dialog: MatDialog
  ) { }

  loading: boolean;
  viewList: any = [];
  maxEntries = 60; // hard limit by cognito!
  nextToken: string = null;

  ngOnInit() {
    this.loadView(false);
  }

  loadView(forceUpdate: boolean): void {
    this.setLoading(true);
    this.backendSVC.cognitoAction('listCognitoUsers', { maxEntries: this.maxEntries, nextToken: this.nextToken }).then(
      (data: any) => {
        if (data.success) {
          this.viewList = data.list || [];
          this.nextToken = data.PaginationToken || null;
        } else {
          this.tabsSVC.printNotification(data.message || 'Error while loading');
        }
        this.setLoading(false);
      },
      (err: any) => {
        console.error(err);
        this.tabsSVC.printNotification('Error while loading');
        this.setLoading(false);
      }
    );
  }
  btnEditUser(thisID: string) {
    const dialogRef = this.dialog.open(UserProfileDialogComponent, { width: '650px', disableClose: false, data: { id: thisID } });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'refreshview') { this.loadView(true); }
    });
  }
  btnNewUser() {
    const dialogRef = this.dialog.open(NewUserProfileDialogComponent, { width: '450px', disableClose: false, data: {} });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'refreshview') { this.loadView(true); }
    });
  }
  setLoading(on: boolean) {
    this.loading = on;
    this.tabsSVC.setLoading(on);
  }
}
