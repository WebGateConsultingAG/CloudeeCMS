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

import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { MatDialog } from '@angular/material/dialog';

@Injectable()
export class TabsNavService {
    constructor(
        private toaster: MatSnackBar,
        public dialog: MatDialog
    ) { }

    loading = false;
    selectedTabIndex = 0;
    ignoreUnsavedChangesOnExit = false;
    internalClipboard = '';
    lstTabs: any = [
        { title: 'Home', tabid: 'tab-home', compo: 'app-home', preventClose: true, icon: 'home' }
    ];
    public hasInternalClipboardContent = false;

    public setLoading(on: boolean) {
        this.loading = on;
    }

    getExistingTabIndexByID(id: string): number {
        for (let i = 0; i < this.lstTabs.length; i++) { if (this.lstTabs[i].tabid === id) { return i; } }
        return -1;
    }
    public onTabSwitch(val: number) {
        this.selectedTabIndex = val;
        const thisTab = this.lstTabs[this.selectedTabIndex];
        if (typeof thisTab.onTabFocus !== 'undefined') {
            thisTab.onTabFocus();
        }
    }
    public addTabEvent(tabID: string, evName: string, evFn: any) {
        const tabIndex = this.getExistingTabIndexByID(tabID);
        if (tabIndex >= 0) { this.lstTabs[tabIndex][evName] = evFn; }
    }
    public setTabHasChanges(tabID: string, hasChanges: boolean): void {
        const tabIndex = this.getExistingTabIndexByID(tabID);
        if (tabIndex >= 0) { this.lstTabs[tabIndex].hasChanges = hasChanges; }
    }
    public setTabDataExpired(tabID: string, expired: boolean) {
        const tabIndex = this.getExistingTabIndexByID(tabID);
        if (tabIndex >= 0) { this.lstTabs[tabIndex].needsUpdate = expired; }
    }
    public isTabDataExpired(tabID: string) {
        const tabIndex = this.getExistingTabIndexByID(tabID);
        if (tabIndex >= 0) { return this.lstTabs[tabIndex].needsUpdate === true; }
    }
    public closeTab(idx: number) {
        if (this.lstTabs[idx].hasChanges) {
            if (!confirm('Discard unsaved changes?')) { return; }
        }
        let newTabIndex = this.selectedTabIndex - 1;
        if (newTabIndex < 0 && this.lstTabs.length > 1) { newTabIndex = 0; } // first tab closed, but at least one remaining to the right
        this.selectedTabIndex = newTabIndex;
        this.lstTabs.splice(idx, 1);
    }
    public closeTabByID(id: string) {
        const idx = this.getExistingTabIndexByID(id);
        if (idx >= 0) { this.closeTab(idx); }
    }
    public hasUnsavedTabs(): boolean {
        if (this.ignoreUnsavedChangesOnExit !== true) {
            for (const tb of this.lstTabs) {
                if (tb.hasChanges === true) { return true; }
            }
        }
        return false;
    }
    public setIgnoreUnsavedChanges(ignore: boolean) {
        this.ignoreUnsavedChangesOnExit = ignore;
    }
    public navigateTo(npath: string) {
        if (npath === 'editor/pages') {
            this.openTab('Pages', 'app-pages', 'tab-pages', 'description');
        } else if (npath === 'editor/layouts') {
            this.openTab('Layouts', 'app-layouts', 'tab-layouts', 'table_chart');
        } else if (npath === 'editor/microtemplates') {
            this.openTab('Microtemplates', 'app-mtlist', 'tab-mtlist', 'dns');
        } else if (npath === 'editor/blocks') {
            this.openTab('Layout Blocks', 'app-compos', 'tab-compos', 'art_track');
        } else if (npath === 'editor/fileexplorer') {
            this.openTab('File Explorer', 'app-listfiles', 'tab-listfiles', 'insert_drive_file');
        } else if (npath === 'editor/forms') {
            this.openTab('Forms', 'app-forms', 'tab-forms', 'assignment');
        } else if (npath === 'formsinbox') {
            this.openTab('Forms Inbox', 'app-formsinbox', 'tab-formsinbox', 'inbox');
        } else if (npath === 'settings') {
            this.openTab('Settings', 'app-settings', 'tab-settings', 'build');
        } else if (npath === 'home') {
            this.openTab('Home', 'app-home', 'tab-home', 'home');
        } else if (npath === 'editor/pubqueue') {
            this.openTab('Publication Queue', 'app-pubqueue', 'tab-pubqueue', 'library_books');
        } else if (npath === 'myprofile') {
            this.openTab('My User Profile', 'app-myprofile', 'tab-myprofile', 'person');
        } else if (npath === 'useradmin') {
            this.openTab('User Administration', 'app-userlist', 'tab-userlist', 'supervisor_account');
        } else if (npath.startsWith('editor/layouts/edit/')) {
            const id = npath.split('/')[3];
            this.openTabWithDocID('Layout..', 'app-layoutedit', 'tab-layout-' + id, id);
        } else if (npath.startsWith('editor/microtemplates/edit/')) {
            const id = npath.split('/')[3];
            this.openTabWithDocID('Microtemplate..', 'app-mtedit', 'tab-mt-' + id, id);
        } else if (npath.startsWith('editor/blocks/edit/')) {
            const id = npath.split('/')[3];
            this.openTabWithDocID('Layout Block..', 'app-blockedit', 'tab-block-' + id, id);
        } else if (npath.startsWith('editor/pages/edit/')) {
            const id = npath.split('/')[3];
            this.openTabWithDocID('Page..', 'app-pageedit', 'tab-page-' + id, id);
        } else if (npath.startsWith('editor/forms/edit/')) {
            const id = npath.split('/')[3];
            this.openTabWithDocID('Form..', 'app-formedit', 'tab-form-' + id, id);
        } else if (npath.startsWith('formsinbox/view/')) {
            const id = npath.split('/')[2];
            this.openTabWithDocID('Form..', 'app-submittedform', 'tab-submittedform-' + id, id);
        } else if (npath.startsWith('editor/files/edit/')) {
            const id = npath.split('/')[3];
            this.openTabWithDocID('File..', 'app-fileeditor', 'tab-fileeditor-' + id, id);
        }
    }
    public openTabWithDocID(title: string, compo: string, tabid: string, docid: string) {
        if (!compo || compo === '') { return; }
        const tabIndex = this.getExistingTabIndexByID(tabid);
        if (tabIndex >= 0) { // open existing tab
            this.selectedTabIndex = tabIndex;
        } else { // open new tab
            this.setLoading(true);
            this.lstTabs.push({ title, tabid, compo, docid });
            this.selectedTabIndex = this.lstTabs.length;
        }
    }
    public openTab(title: string, compo: string, tabid: string, icon: string) {
        if (!compo || compo === '') { return; }
        const tabIndex = this.getExistingTabIndexByID(tabid);
        if (tabIndex >= 0) { // open existing tab
            this.selectedTabIndex = tabIndex;
        } else { // open new tab
            if (tabid !== 'tab-listfiles') { this.setLoading(true); }
            this.lstTabs.push({ title, tabid, compo, icon });
            this.selectedTabIndex = this.lstTabs.length;
        }
    }
    public changeTabID(oldID: string, newTabID: string, newID: string) {
        const tabIndex = this.getExistingTabIndexByID(oldID);
        if (tabIndex < 0) {
            console.warn('Unable to change Tab ID', oldID, newTabID);
            return;
        }
        this.lstTabs[tabIndex].tabid = newTabID;
        this.lstTabs[tabIndex].docid = newID;
    }
    public setTabTitle(tabid: string, title: string) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.lstTabs.length; i++) {
            if (this.lstTabs[i].tabid === tabid) {
                this.lstTabs[i].title = title;
                return;
            }
        }
    }
    public printNotification(msg: string) {
        this.toaster.open(msg, '', { duration: 4000 });
    }
    public setInternalClipboard(obj: any) {
        this.hasInternalClipboardContent = true;
        this.internalClipboard = obj;
    }
    public getInternalClipboard(): any {
        return this.internalClipboard || '';
    }
    public getGUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4();
    }
}
