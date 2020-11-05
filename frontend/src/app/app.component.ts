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

import { Component, ViewChild, OnInit, ViewEncapsulation, OnDestroy, NgZone } from '@angular/core';
import { MatSidenav } from '@angular/material';
import { BackendService } from './services/backend.service';
import { TabsNavService } from './services/tabs.service';
import { environment } from '../environments/environment';
import { AboutDialogComponent } from './settings/AboutDialog';
import { MatDialog } from '@angular/material';
import { WGCCognitoService } from './services/wgccognito.service';
import { UpdaterDialogComponent } from './settings/dialogs/updater-dialog';
import { FileBrowserService } from './services/filebrowser.service';

declare var window: any;
declare var jQuery: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav', null) public sidenav: MatSidenav;

  constructor(
    public tabsSVC: TabsNavService,
    private backendSVC: BackendService,
    public dialog: MatDialog,
    public cognitoSVC: WGCCognitoService,
    private ngZone: NgZone,
    private fileBrowserSVC: FileBrowserService
  ) { }

  loading = false;
  config: any;
  apptitle = 'CloudeeCMS for AWS';
  opened = false; // sidebar
  configLoaded = false;
  notifications = [];
  darkMode = false;

  ngOnInit() {
    this.apptitle = environment.app_name;

    const theme = localStorage.getItem('theme');
    if (theme && theme === 'darkmode') { this.setDarkMode(true); }

    // Export functions for trumbowyg external plugins
    window.pubfn = window.pubfn || {};
    window.pubfn.CDNListFiles = this.CDNListFiles.bind(this);

    this.waitForLogin(this);
  }
  btnShowAboutDialog() {
    this.dialog.open(AboutDialogComponent, { width: '450px', disableClose: true });
  }
  waitForLogin(that) {
    if (!that.configLoaded && that.cognitoSVC.signedIn) {
      that.loadConfig();
      window.g_warnOnUnload = true;
      window.addEventListener('beforeunload', (event) => {
        if (window.g_warnOnUnload) { event.returnValue = `Do you really want to close CloudeeCMS?`; }
      });
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
        if (that.config.apptitle && that.config.apptitle !== '') {
          that.apptitle = that.config.apptitle;
          window.document.title = 'CloudeeCMS | ' + that.apptitle;
        }
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
    this.dialog.open(UpdaterDialogComponent, { width: '450px', disableClose: true, data: {} });
  }
  btnLogout() {
    window.g_warnOnUnload = false;
    this.cognitoSVC.logout();
  }

  // Export functions outside angular for trumbowyg plugins
  CDNListFiles(strPath: string, cb: any) {
    this.ngZone.run(() => this.fileBrowserSVC.listFilesOfBucket('CDN', strPath, ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'], cb));
  }

  toggleDarkMode(): void {
    this.setDarkMode(!this.darkMode);
  }

  setDarkMode(enabled: boolean) {
    this.darkMode = enabled;
    if (this.darkMode) {
      jQuery('body').addClass('dm');
    } else {
      jQuery('body').removeClass('dm');
    }
    localStorage.setItem('theme', this.darkMode ? 'darkmode' : '');
  }

  ngOnDestroy() {
    // Remove exported functions
    window.pubfn.CDNListFiles = null;
  }
}
