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
    selector: 'app-bmedit-dialog',
    templateUrl: 'bookmarkedit-dialog.html'
})

export class BookmarkEditDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    loading: boolean;
    bm: any;
    isNew: boolean;

    ngOnInit(): void {
        if (!this.data.bm) { this.isNew = true; }
        this.bm = this.data.bm || {};
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    btnDone(): void {
        this.dialogRef.close({ action: (this.isNew ? 'add' : ''), bm: this.bm });
    }
}
