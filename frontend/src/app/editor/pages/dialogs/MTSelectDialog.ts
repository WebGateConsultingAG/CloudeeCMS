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
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-mtselect-dialog',
    templateUrl: 'MTSelectDialog.html'
})

export class MTSelectDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private backendSVC: BackendService,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    selectedMT: any = '';
    errorMessage = '';
    loading: boolean;
    lstMT: any = [];
    fld: any;
    shortdesc = '';

    ngOnInit(): void {
        const that = this;
        this.fld = this.data.fld;
        this.loading = true;
        this.backendSVC.getAllMicroTemplates(false).then(
            (data: any) => {
                if (that.fld.fldType === 'container' && that.fld.restrictChilds && that.fld.accepts.length > 0) {
                    const mt = JSON.parse(JSON.stringify(data));
                    const lst = [];
                    mt.forEach(element => {
                        if (that.fld.accepts.indexOf(element.id) >= 0) { lst.push(element); }
                    });
                    that.lstMT = lst;
                } else {
                    that.lstMT = JSON.parse(JSON.stringify(data));
                }
                that.loading = false;
            },
            (err) => {
                that.loading = false;
                console.log('Error while loading microtemplates', err);
            }
        );
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    btnAdd(): void {
        if (this.selectedMT === '') { return; }
        this.selectedMT.shortdesc = this.shortdesc;
        this.dialogRef.close({ mt: this.selectedMT, action: 'add', fld: this.fld });
    }
}
