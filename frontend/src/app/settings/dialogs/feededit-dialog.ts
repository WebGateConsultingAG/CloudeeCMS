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

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-feededit-dialog',
    templateUrl: 'feededit-dialog.html'
})

export class FeedEditDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    loading: boolean;
    feed: any = {};
    isNew: boolean;

    lstCategories = [];

    lstFTypes = [
        { label: 'JSON Feed', val: 'JSON'},
        { label: 'Sitemap for Search Engine', val: 'Sitemap'},
        { label: 'Atom Feed', val: 'Atom' }
    ];

    ngOnInit(): void {
        this.feed = this.data.feed || {};
        if (!this.data.feed) {
            this.isNew = true;
            this.feed.id = this.getGUID();
        }
        this.lstCategories = this.data.lstCategories || [];
    }
    onFeedTypeChange(): void {
        this.feed.category = null;
        this.feed.filename = '';
        if (this.feed.ftype === 'Sitemap') {
            this.feed.filename = 'sitemap.xml';
        // } else if (this.feed.ftype === 'Atom') {
        // } else if (this.feed.ftype === 'JSON') {
        }
    }
    validateDialog(): boolean {
        let rc = true;
        if (this.feed.ftype === 'Sitemap') {
            if (!this.feed.sitename || this.feed.sitename === '') { rc = false; }
         } else if (this.feed.ftype === 'Atom') {
            if (!this.feed.sitename || this.feed.sitename === '') { rc = false; }
            if (!this.feed.title || this.feed.title === '') { rc = false; }
        // } else if (this.feed.ftype === 'JSON') {
        }
        return rc;
    }
    getGUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4();
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    btnDone(): void {
        if (this.validateDialog()) {
            this.dialogRef.close({ action: (this.isNew ? 'add' : ''), feed: this.feed });
        } else {
            alert('Please fill in all required fields.');
        }
    }
}
