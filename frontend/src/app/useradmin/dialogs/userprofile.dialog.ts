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
    this.id = id;
    this.loading = true;
    this.backendSVC.cognitoAction('getCognitoUser', { id }).then(
      (data: any) => {
        if (data.success) {
          if (data.found) {
            this.usr = data.user || {};
            this.userLoaded = true;
          } else {
            this.tabsSVC.printNotification("User not found");
          }
        } else {
          this.tabsSVC.printNotification(data.message || "User not found");
        }
        this.loading = false;
      },
      (err: any) => {
        this.loading = false;
        console.error('Error', err);
        this.tabsSVC.printNotification("Failed to load user");
      }
    );
  }
  btnToggleStatus() {
    const enable = !this.usr.Enabled;
    if (!confirm('Do you really want to ' + (enable ? 'enable' : 'disable') + ' this user?')) return;

    this.backendSVC.cognitoAction('toggleCognitoUser', { id: this.usr.id, enable }).then(
      (data: any) => {
        if (data.success) {
          this.dialogRef.close({ action: 'refreshview' });
        } else {
          this.tabsSVC.printNotification(data.message || 'Failed to update user');
          this.loading = false;
        }
      },
      (err: any) => {
        this.loading = false;
        console.error('Error', err);
        this.tabsSVC.printNotification('Failed to save user');
      }
    );
  }
  btnSave() {
    this.loading = true;
    this.backendSVC.cognitoAction('saveCognitoUser', { usr: this.usr }).then(
      (data: any) => {
        if (data.success) {
          this.dialogRef.close({ action: 'refreshview' });
        } else {
          this.tabsSVC.printNotification(data.message || 'Failed to save user');
          this.loading = false;
        }
      },
      (err: any) => {
        this.loading = false;
        console.error('Error', err);
        this.tabsSVC.printNotification('Failed to save user');
      }
    );
  }
  btnDelete() {
    if (!confirm('Do you really want to DELETE this user?')) return;

    this.backendSVC.cognitoAction('deleteCognitoUser', { id: this.usr.id }).then(
      (data: any) => {
        if (data.success) {
          this.dialogRef.close({ action: 'refreshview' });
        } else {
          this.tabsSVC.printNotification(data.message || 'Failed to save user');
          this.loading = false;
        }
      },
      (err: any) => {
        this.loading = false;
        console.error('Error', err);
        this.tabsSVC.printNotification('Failed to delete user');
      }
    );
  }
  btnAddGroup() {
    const dialogRef = this.dialog.open(GroupAddDialogComponent, {
      width: '400px',
      data: { usergroups: this.usr.groups, userID: this.id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        if (result && result !== '') {
          if (this.usr.groups.indexOf(result) < 0) { this.usr.groups.push(result); }
        }
      }
    });
  }
  btnRemoveGroup(groupname: string): void {
    if (!confirm(`Remove user from group ${groupname} ?`)) return;
    this.backendSVC.cognitoAction('removeUserFromGroup', { id: this.id, groupname }).then(
      (data: any) => {
        if (data.success) {
          for (let i = 0; i < this.usr.groups.length; i++) {
            if (this.usr.groups[i] === groupname) { this.usr.groups.splice(i, 1); }
          }
        } else {
          this.tabsSVC.printNotification(data.message || 'Failed to save user');
        }
      },
      (err: any) => {
        console.log('Error', err);
        this.tabsSVC.printNotification('Failed to remove user from group');
      }
    );
  }

  btnClose() {
    this.dialogRef.close(null);
  }
}
