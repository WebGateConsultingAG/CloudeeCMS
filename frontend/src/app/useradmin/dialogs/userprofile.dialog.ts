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
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { GroupAddDialogComponent } from './addgroup-dialog';
import { TabsNavService } from 'src/app/services/tabs.service';

@Component({
  selector: 'app-userprofile',
  templateUrl: './userprofile.dialog.html',
  styleUrls: ['./userprofile.dialog.css']
})

export class UserProfileDialogComponent implements OnInit {

  constructor(
    private backendSVC: BackendService,
    public dialogRef: MatDialogRef<Component>,
    public dialog: MatDialog,
    private tabsSVC: TabsNavService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  id: string;
  loading: boolean;
  userLoaded: boolean;
  usr: any;
  errorMessage: string;

  ngOnInit() {
    this.id = this.data.id;
    this.loadUserByID(this.id);
  }

  loadUserByID(id: string) {
    const that = this;
    this.id = id;
    that.loading = true;
    this.backendSVC.getCognitoUser(id).then(
      (data: any) => {
        that.loading = false;
        if (data.found) {
          that.usr = data.user || {};
          that.userLoaded = true;
        }
      },
      (err) => {
        that.loading = false;
        console.error('Error', err);
        that.errorMessage = 'Failed to load user';
      }
    );
  }
  btnToggleStatus() {
    const that = this;
    const enable = !this.usr.Enabled;
    if (!confirm('Do you really want to ' + (enable ? 'enable' : 'disable') + ' this user?')) { return; }

    this.backendSVC.toggleCognitoUser(this.usr.id, enable).then(
      (data: any) => {
        that.dialogRef.close({ action: 'refreshview' });
      },
      (err) => {
        that.loading = false;
        console.error('Error', err);
        that.errorMessage = 'Failed to save user';
      }
    );
  }
  btnSave() {
    const that = this;
    this.loading = true;
    this.backendSVC.saveCognitoUser(this.usr).then(
      (data: any) => {
        that.dialogRef.close({ action: 'refreshview' });
      },
      (err) => {
        that.loading = false;
        console.error('Error', err);
        that.errorMessage = 'Failed to save user';
      }
    );
  }
  btnDelete() {
    if (!confirm('Do you really want to DELETE this user?')) { return; }
    const that = this;
    this.backendSVC.deleteCognitoUser(this.usr.id).then(
      (data: any) => {
        that.dialogRef.close({ action: 'refreshview' });
      },
      (err) => {
        that.loading = false;
        console.error('Error', err);
        that.errorMessage = 'Failed to delete user';
      }
    );
  }
  btnAddGroup() {
    const that = this;
    const dialogRef = that.dialog.open(GroupAddDialogComponent, {
      width: '400px',
      data: { usergroups: that.usr.groups, userID: that.id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        if (result && result !== '') {
          if (that.usr.groups.indexOf(result) < 0) { that.usr.groups.push(result); }
        }
      }
    });
  }
  btnRemoveGroup(groupname: string): void {
    if (!confirm(`Remove user from group ${groupname} ?`)) { return; }
    const that = this;
    this.backendSVC.cognitoRemoveUserFromGroup(that.id, groupname).then(
      (data: any) => {
        if (data.success) {
          for (let i = 0; i < that.usr.groups.length; i++) {
            if (that.usr.groups[i] === groupname) { that.usr.groups.splice(i, 1); }
          }
        }
      },
      (err) => {
        console.log('Error', err);
        that.tabsSVC.printNotification('Failed to remove user from group!');
      }
    );
  }

  btnClose() {
    this.dialogRef.close(null);
  }
}
