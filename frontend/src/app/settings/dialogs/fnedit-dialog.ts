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
    selector: 'app-fnedit-dialog',
    templateUrl: 'fnedit-dialog.html'
})

export class GlobalFunctionEditDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    loading: boolean;
    fn: any;
    isNew: boolean;
    fnHint = '';

    ngOnInit(): void {
        if (!this.data.fn) { this.isNew = true; }
        this.fn = this.data.fn || {};
    }
    checkFn(): void {
        this.fnHint = '';
        if (!this.fn.body || this.fn.body === '') {
            return;
        } else if (!this.fn.body.startsWith('- function ')) {
            this.fnHint = 'Function code should start with: - function';
        }
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    btnDone(): void {
        this.dialogRef.close({ action: (this.isNew ? 'add' : ''), fn: this.fn });
    }
}
