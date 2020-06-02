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

import { Component, ViewChild, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSidenav } from '@angular/material';
import { BackendService } from './services/backend.service';
import { TabsNavService } from './services/tabs.service';
import { environment } from '../environments/environment';
import { AboutDialogComponent } from './settings/AboutDialog';
import { MatDialog } from '@angular/material';
import { WGCCognitoService } from './services/wgccognito.service';
import { UpdaterDialogComponent } from './settings/dialogs/updater-dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class AppComponent implements OnInit {
  @ViewChild('sidenav', null) public sidenav: MatSidenav;

  constructor(
    public tabsSVC: TabsNavService,
    private backendSVC: BackendService,
    public dialog: MatDialog,
    public cognitoSVC: WGCCognitoService
  ) { }

  loading = false;
  config: any;
  apptitle = 'CloudeeCMS for AWS';
  opened = false; // sidebar
  configLoaded = false;
  notifications = [];

  ngOnInit() {
    this.apptitle = environment.app_name;
    this.waitForLogin(this);
  }
  btnShowAboutDialog() {
    this.dialog.open(AboutDialogComponent, { width: '450px', disableClose: true });
  }
  waitForLogin(that) {
    if (!that.configLoaded && that.cognitoSVC.signedIn) {
      that.loadConfig();
    } else {
      setTimeout(() => { that.waitForLogin(that); }, 600);
    }
  }

  btnNavigateTo(npath: string) { // used by sidenav
    this.sidenav.close();
    this.tabsSVC.navigateTo(npath);
  }

  loadConfig(): void {
    const that = this;
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        that.config = rc.cfg;
        if (that.config.apptitle && that.config.apptitle !== '') { that.apptitle = that.config.apptitle; }
        that.configLoaded = true;
        that.tabsSVC.setLoading(false);
        that.loadNotifications();

        if (rc.userGroups) {
          console.log('UserGroups', rc.userGroups);
          if (rc.userGroups.indexOf('CloudeeCMS-LayoutEditor') >= 0) { that.backendSVC.isLayoutEditor = true; }
          if (rc.userGroups.indexOf('CloudeeCMS-UserAdmin') >= 0) { that.backendSVC.isUserAdmin = true; }
          if (rc.userGroups.indexOf('CloudeeCMS-Admin') >= 0) { that.backendSVC.isAdmin = true; }
        }
      },
      (err) => {
        console.log('Error while loading configuration', err);
      }
    );
  }
  loadNotifications(): void {
    const that = this;
    this.backendSVC.getNotifications().then(
      (rc: any) => {
        that.notifications = rc.notifications;
      },
      (err) => {
        console.log('Error while loading notifications', err);
      }
    );
  }
  btnShowUpdater(): void {
    this.dialog.open(UpdaterDialogComponent, { width: '450px', disableClose: true, data: { } });
  }
  btnLogout() {
    this.cognitoSVC.logout();
  }
}
