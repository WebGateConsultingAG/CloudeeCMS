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
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
    selector: 'app-layoutfield-dialog',
    templateUrl: 'layoutfield.dialog.html',
    styles: ['.dropDownSelTable input { width: 100%; }']
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
        if (!this.validateDropDown()) {
            return;
        }
        if (!this.isNew) {
            this.orgFld.fldType = this.fld.fldType;
            this.orgFld.fldName = this.fld.fldName;
            this.orgFld.fldTitle = this.fld.fldTitle;
            if (this.fld.fldType === 'dropdown') {
                this.orgFld.multiple = this.fld.multiple;
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
    validateDropDown(): boolean {
        this.selValueValidation = '';
        if (this.fld.fldType !== 'dropdown') { return true; }
        if (this.fld.fldValueType === 'JSON' && this.fld.multiple) {
            this.selValueValidation = 'Field value type cannot be JSON for multivalue fields';
            return false;
        }

        // tslint:disable-next-line: prefer-for-of
        for (let x = 0; x < this.fld.selValues.length; x++) {
            if (this.fld.fldValueType === 'JSON') { // verify JSON values
                if (this.fld.selValues[x].val === '') {
                    this.selValueValidation = 'Please specify JSON value for \'' + this.fld.selValues[x].label + '\'.';
                    return false;
                }
                try {
                    JSON.parse(this.fld.selValues[x].val);
                } catch (e) {
                    // tslint:disable-next-line: max-line-length
                    this.selValueValidation = 'Failed to parse JSON value of \'' + this.fld.selValues[x].label + '\'. Check the JSON syntax and make sure property names are enclosed in quotation marks!';
                    return false;
                }
            } else {
                if (this.fld.selValues[x].val === '') {
                    this.fld.selValues[x].val = this.fld.selValues[x].label;
                } else if (this.fld.selValues[x].label === '') {
                    this.fld.selValues[x].label = this.fld.selValues[x].val;
                }
            }
        }
        return true;
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
    dropSortObj(lst, event: CdkDragDrop<string[]>) {
        moveItemInArray(lst, event.previousIndex, event.currentIndex);
    }
    btnAddDDEntry(): void {
        if (typeof this.fld.selValues === 'undefined') { this.fld.selValues = []; }
        this.fld.selValues.push({ label: '', val: '' });
    }
    btnDeleteDDEntry(entry: any) {
        for (let i = 0; i < this.fld.selValues.length; i++) {
            if (this.fld.selValues[i] === entry) { this.fld.selValues.splice(i, 1); }
        }
    }
}
