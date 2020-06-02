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
    selector: 'app-cfdistedit-dialog',
    templateUrl: 'cfdistedit-dialog.html'
})

export class CFDistEditDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    loading: boolean;
    dist: any;
    isNew: boolean;
    chkVar = new RegExp(/^[a-z0-9]+$/i);
    webURLVarError = false;

    ngOnInit(): void {
        if (!this.data.dist) { this.isNew = true; }
        this.dist = this.data.dist || {};
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    btnDone(): void {
        if (this.webURLVarError) {
            this.dist.webURLVAR = '';
            alert('Illegal characters in web URL variable name!');
            return;
        }
        this.dialogRef.close({ action: (this.isNew ? 'add' : ''), dist: this.dist });
    }
    chkWebURLVarError(): void {
        this.webURLVarError = false;
        const webURLVAR = this.dist.webURLVAR || '';
        if (webURLVAR === '') { return; }
        if (webURLVAR === 'navtree') { return; } // reserved name
        this.webURLVarError = !this.chkVar.test(webURLVAR);
    }
}
