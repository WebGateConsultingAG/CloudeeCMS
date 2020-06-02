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
    selector: 'app-layoutfield-dialog',
    templateUrl: 'layoutfield.dialog.html'
})

export class LayoutFieldDialogComponent implements OnInit {
    constructor(
        private backendSVC: BackendService,
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    orgFld: any;
    fld: any = {};
    isNew: boolean;
    selValueValidation = '';
    loading: boolean;
    lstMT: any = null;
    lstMTLoaded: boolean;
    lstFldTypesAvail: any = [
        { val: 'text', label: 'Text' },
        { val: 'textarea', label: 'Textarea' },
        { val: 'richtext', label: 'Richtext Editor' },
        { val: 'dropdown', label: 'Dropdown List' },
        { val: 'checkbox', label: 'Checkbox' },
        { val: 'container', label: 'Object Container' },
        { val: 'image', label: 'Image Selection' },
        { val: 'number', label: 'Number' }
    ];
    lstFldTypes: any = [];

    ngOnInit(): void {
        // set available field types
        if (this.data.accept && this.data.accept.length > 0) {
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.lstFldTypesAvail.length; i++) {
                if (this.data.accept.indexOf(this.lstFldTypesAvail[i].val) >= 0) {
                    this.lstFldTypes.push(this.lstFldTypesAvail[i]);
                }
            }
        } else {
            this.lstFldTypes = this.lstFldTypesAvail;
        }

        if (this.data.isNew) {
            this.isNew = true;
        } else {
            this.orgFld = this.data.fld;
            this.fld = JSON.parse(JSON.stringify(this.data.fld));
            if (this.fld.restrictChilds) { this.loadMTSelection(); }
        }
    }
    loadMTSelection(): void {
        if (this.lstMTLoaded) { return; }
        const that = this;
        this.backendSVC.getAllMicroTemplates(false).then(
          (data: any) => {
            that.lstMT = JSON.parse(JSON.stringify(data)); // decouple
            that.lstMTLoaded = true;
            that.loading = false;
          },
          (err) => {
            that.loading = false;
            console.log('Error while loading microtemplates', err);
          }
        );
      }

    btnApply(): void {
        this.onSelValueChange();
        if (this.selValueValidation !== '') {
            alert(this.selValueValidation);
            return;
        }
        if (!this.isNew) {
            this.orgFld.fldType = this.fld.fldType;
            this.orgFld.fldName = this.fld.fldName;
            this.orgFld.fldTitle = this.fld.fldTitle;
            if (this.fld.fldType === 'dropdown') {
                this.orgFld.multiple = this.fld.multiple;
                this.orgFld.selectionValues = this.fld.selectionValues;
                this.orgFld.selValues = this.fld.selValues;
                this.orgFld.selType = this.fld.selType;
                this.orgFld.fldValueType = this.fld.fldValueType;
            } else if (this.fld.fldType === 'container') {
                this.orgFld.restrictChilds = this.fld.restrictChilds;
                this.orgFld.accepts = this.fld.restrictChilds ? this.fld.accepts : null;
            }
            this.dialogRef.close(null);
        } else {
            this.dialogRef.close({ action: 'addnew', fld: this.fld });
        }
    }
    onSelValueChange(): void {
        this.selValueValidation = '';
        if (this.fld.fldType !== 'dropdown') { return; }
        if (this.fld.selectionValues.startsWith('[')) { // JSON
            this.fld.selValues = JSON.parse(this.fld.selectionValues);
            // tslint:disable-next-line: prefer-for-of
            for (let x = 0; x < this.fld.selValues.length; x++) {
                if (typeof this.fld.selValues[x].val === 'undefined' || typeof this.fld.selValues[x].label === 'undefined') {
                    this.selValueValidation = 'Each JSON array entry must have both a \'val\' and \'label\' property!';
                }
            }
        } else {
            const lstTmp = this.fld.selectionValues.split('\n');
            this.fld.selValues = lstTmp.map(row => {
                if (row.indexOf('|') > 0) {
                    const tmp = row.split('|');
                    return { label: tmp[0], val: tmp[1] };
                } else {
                    return { label: row, val: row };
                }
            });
        }
        if (this.fld.fldValueType === 'JSON' && this.fld.multiple) {
            this.selValueValidation = 'Field value type cannot be JSON for multivalue fields';
        }
    }
    isValidated(): boolean {
        let isOK = true;
        if (!this.fld.fldName || this.fld.fldName === '') { isOK = false; }
        if (!this.fld.fldTitle || this.fld.fldTitle === '') { isOK = false; }
        if (!this.fld.fldType || this.fld.fldType === '') { isOK = false; }
        return isOK;
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }

}
