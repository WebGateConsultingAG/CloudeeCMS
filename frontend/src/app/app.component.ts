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
import { MatSidenav } from '@angular/material/sidenav';
import { BackendService } from './services/backend.service';
import { TabsNavService } from './services/tabs.service';
import { environment } from '../environments/environment';
import { AboutDialogComponent } from './settings/AboutDialog';
import { MatDialog } from '@angular/material/dialog';
import { UpdaterDialogComponent } from './settings/dialogs/updater-dialog';
import { FileBrowserService } from './services/filebrowser.service';
import { UserLoginService } from './auth/userlogin.service';

declare var window: any;
declare var jQuery: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav', {}) public sidenav: MatSidenav;

  constructor(
    public tabsSVC: TabsNavService,
    private backendSVC: BackendService,
    public dialog: MatDialog,
    private ngZone: NgZone,
    public usrSVC: UserLoginService,
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
    if (!that.configLoaded && that.usrSVC.isLoggedIn) {
      that.loadConfig();
      window.addEventListener('beforeunload', (event) => {
        if (this.tabsSVC.hasUnsavedTabs()) {
          event.returnValue = `There are unsaved changes. Do you really want to close CloudeeCMS?`;
        }
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
    this.backendSVC.getConfig(false).then(
      (rc: any) => {
        this.config = rc.cfg;
        if (this.config.apptitle && this.config.apptitle !== '') {
          this.apptitle = this.config.apptitle;
          window.document.title = 'CloudeeCMS | ' + this.apptitle;
        }
        this.configLoaded = true;
        this.tabsSVC.setLoading(false);
        this.loadNotifications();

        if (rc.userGroups) {
          console.log('UserGroups', rc.userGroups);
          if (rc.userGroups.indexOf('CloudeeCMS-LayoutEditor') >= 0) { this.backendSVC.isLayoutEditor = true; }
          if (rc.userGroups.indexOf('CloudeeCMS-UserAdmin') >= 0) { this.backendSVC.isUserAdmin = true; }
          if (rc.userGroups.indexOf('CloudeeCMS-Admin') >= 0) { this.backendSVC.isAdmin = true; }
        }
      },
      (err) => {
        console.log('Error while loading configuration', err);
      }
    );
  }
  loadNotifications(): void {
    this.backendSVC.getNotifications().then(
      (rc: any) => {
        this.notifications = rc.notifications;
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
    if (this.tabsSVC.hasUnsavedTabs()) {
      if (!confirm('There are unsaved changes.\nAre you sure you want to log out?')) { return false; }
    }
    this.tabsSVC.setIgnoreUnsavedChanges(true);
    this.usrSVC.logout(true); // true = reload window after logout
  }
  btnShowLoginForm(): void {
    this.tabsSVC.showLoginForm({ onSuccessReload: false });
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
