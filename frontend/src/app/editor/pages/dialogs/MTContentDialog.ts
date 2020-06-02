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
import { MatDialog } from '@angular/material';
import { MTSelectDialogComponent } from '../dialogs/MTSelectDialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FileSelectionDialogComponent } from './FileSelectionDialog';


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
            ['insertImage'],
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
        this.fldMT = this.data.fldMT;
        this.fldMT.custFields.forEach(fld => {
            if (typeof fld.fldValue === 'undefined') { fld.fldValue = ''; }
        });
        this.loading = false;
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
            selectedBucket: 'CDN', dlgTitle: 'Select image', fileFilter: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tif', 'tiff']
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
