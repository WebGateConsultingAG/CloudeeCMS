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
import { MatDialog } from '@angular/material/dialog';
import { MTSelectDialogComponent } from '../dialogs/MTSelectDialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FileSelectionDialogComponent } from './FileSelectionDialog';
import { BackendService } from 'src/app/services/backend.service';


@Component({
    selector: 'app-mtcontent-dialog',
    templateUrl: 'MTContentDialog.html',
    styles: [`
    .nestedMTcontainer { margin-bottom: 4px; border: 1px solid #dcdcdc; border-radius: 4px; }
    .permaActions { text-align: right; padding-top: 4px; padding-right: 4px; }
    `]
})

export class MTContentDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private backendSVC: BackendService,
        public dialog: MatDialog,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    loading: boolean;
    fldMT: any;

    trumbooptions: any = { // any, because of missing "semantic" prop. in ngx-trumbowyg
        lang: 'en',
        svgPath: 'assets/img/trumbowyg-icons.svg',
        semantic: { div: 'div' }, // prevent converting <div> to <p>
        removeformatPasted: true,
        resetCss: true,
        autogrow: true,
        imageWidthModalEdit: true,
        btns: [
            ['formatting'],
            ['fontsize'],
            ['strong', 'em', 'del'],
            ['link'],
            ['insertImage'], ['cdnplugin'],
            ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
            ['unorderedList', 'orderedList'],
            ['horizontalRule'],
            ['removeformat'],
            ['viewHTML'],
            ['fullscreen']
        ],
        events: {}
        /*plugins: environment.trumbooptions.plugins*/
    };

    ngOnInit(): void {
        const that = this;
        this.fldMT = this.data.fldMT;
        this.fldMT.custFields.forEach(fld => {
            if (typeof fld.fldValue === 'undefined') { fld.fldValue = ''; }
        });
        that.refreshMTParams(this.fldMT.id);
        this.loading = false;
    }

    refreshMTParams(MTid: string) {
        const that = this;
        this.loading = true;
        this.backendSVC.getAllMicroTemplates(false).then(
            (data: any) => {
                that.loading = false;
                const thisMT = that.getMTByID(data, MTid);
                // Replace nested fldMT.custFields with custFields of MT and append existing fldValue
                thisMT.custFields.forEach(fld => {
                    // tslint:disable-next-line: prefer-for-of
                    for (let fi = 0; fi < that.fldMT.custFields.length; fi++) {
                        if (that.fldMT.custFields[fi].fldName === fld.fldName) {
                            fld.fldValue = that.fldMT.custFields[fi].fldValue || '';
                            if (fld.fldType === 'container') {
                                fld.lstObj = that.fldMT.custFields[fi].lstObj || [];
                            }
                        }
                    }
                });
                that.fldMT.custFields = thisMT.custFields; // Update from MT
            },
            (err) => {
                that.loading = false;
                console.log('Error while loading microtemplates', err);
            }
        );
    }
    getMTByID(lstMT: any, id: string): any {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < lstMT.length; i++) {
            if (lstMT[i].id === id) { return JSON.parse(JSON.stringify(lstMT[i])); }
        }
        return null;
    }

    btnCancel(): void {
        this.dialogRef.close(null);
    }

    btnAdd(): void {
        this.dialogRef.close(null);
    }

    btnDlgSelectImage(fld: any): void {
        const dialogRef = this.dialog.open(FileSelectionDialogComponent,
            { width: '650px', disableClose: false, data: {
            selectedBucket: 'CDN', dlgTitle: 'Select image', fileFilter: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tif', 'tiff', 'webp']
              }}
          );
        dialogRef.afterClosed().subscribe(result => {
            if (result && result.action === 'add') {
                fld.fldValue = result.fileurl;
            }
        });
    }

    // actions for nested MicroTemplates
    btnAddNewObj(fld: any) {
        const dialogRef = this.dialog.open(MTSelectDialogComponent, { width: '450px', disableClose: false, data: { fld } });
        dialogRef.afterClosed().subscribe(result => {
            if (result && result.action === 'add') {
                if (typeof fld.lstObj === 'undefined') { fld.lstObj = []; }
                fld.lstObj.push(result.mt);
            }
        });
    }
    btnEditObj(fldMT) {
        this.dialog.open(MTContentDialogComponent, { width: '800px', disableClose: false, data: { fldMT } });
    }
    btnDeleteObj(lst, fldMT, idx) {
        if (!confirm('Do you really want to delete \'' + fldMT.title + '\'?')) { return; }
        lst.splice(idx, 1);
    }
    dropSortObj(lst, event: CdkDragDrop<string[]>) {
        moveItemInArray(lst, event.previousIndex, event.currentIndex);
    }
}
