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
import { ImageProfile } from './ImageProfile';
import { ImageConversion } from './ImageConversion';

@Component({
    selector: 'app-imgprofileedit-dialog',
    templateUrl: 'imgprofileedit-dialog.html',
    // tslint:disable-next-line: max-line-length
    styles: [`.chkboxfield { font-size: 12px; } .linebox { border: 1px solid grey; padding: 6px; border-radius: 4px; } .linebox h4 { margin-top: 0; } .viewTable thead th { font-size: 12px; } button { margin-right: 6px; }`]
})

export class ImageProfileEditDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    errorMessage = '';
    loading: boolean;
    imgp: ImageProfile;
    imgc: ImageConversion;
    isNew: boolean;
    pathHint = '';
    cmode = 1; // list or edit image conversions

    lstFormats = [
        { val: '', label: '- Do not convert -' },
        { val: 'jpg', label: 'JPEG' },
        { val: 'webp', label: 'WebP' },
        { val: 'png', label: 'PNG' }
    ];
    lstResizeOpts = [
        { val: 'cover', label: 'Cover (default) - Crop to fit, preserve aspect ratio' },
        { val: 'contain', label: 'Contain - Letterbox fit, preserve aspect ratio' },
        { val: 'fill', label: 'Fill - Stretch to fit, ignore aspect ratio' },
        { val: 'inside', label: 'Inside - Large as possible, preserve aspect ratio' },
        { val: 'outside', label: 'Outside - Small as possible, preserve aspect ratio' }
    ];
    lstCCMaxAge = [
        { label: '1 day', val: '86400' },
        { label: '3 days', val: '259200' },
        { label: '1 week', val: '604800' },
        { label: '1 month', val: '2419200' }
    ];

    ngOnInit(): void {
        if (!this.data.imageprofile) {
            this.isNew = true;
            this.imgp = new ImageProfile();
            this.imgp.id = this.getGUID();
        } else {
            this.imgp = JSON.parse(JSON.stringify(this.data.imageprofile));
        }
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    checkPath(): void {
        const thisPath = this.imgp.tpath || '';
        if (thisPath !== '') {
            if (thisPath.startsWith('/')) {
                this.pathHint = 'Path can not start with /';
                return;
            } else if (thisPath.indexOf('\\') >= 0) {
                this.pathHint = 'Use forward slashes!';
                return;
            } else if (thisPath.indexOf(' ') >= 0) {
                this.pathHint = 'No spaces allowed in path!';
                return;
            } else if (!thisPath.endsWith('/')) {
                this.pathHint = 'Path must end with /';
                return;
            }
        }
        this.pathHint = '';
    }
    validateInput(): boolean {
        if (this.pathHint !== '') {
            alert('Upload path: ' + this.pathHint);
            return false;
        } else if (!this.imgp.tpath || this.imgp.tpath === '') {
            alert('Please specify a default upload path!');
            return false;
        } else if (!this.imgp.label || this.imgp.label === '') {
            alert('Please enter a value for label');
            return false;
        }
        return true;
    }
    btnDone(): void {
        if (!this.validateInput()) { return; }
        this.dialogRef.close({ action: (this.isNew ? 'add' : 'update'), imageprofile: this.imgp });
    }
    getGUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4();
    }
    btnEditImageConversion(ic: ImageConversion): void {
        if (ic) {
            this.imgc = ic;
        } else {
            this.imgc = new ImageConversion();
            this.imgc.quality = 85;
            this.imgc.compressionLevel = 9;
            this.imgc.convertformat = '';
        }
        this.cmode = 2;
    }
    btnSaveImageConversion() {
        if (!this.imgc.suffix || this.imgc.suffix === '') {
            alert('You must specify an image filename suffix!');
            return;
        }
        if (this.imgc.convertformat === '' && (!this.imgc.convertheight && !this.imgc.convertwidth)) {
            alert('Please specify either a format or a size!');
            return;
        }
        if (this.imgc.compressionLevel > 9 || this.imgc.compressionLevel < 1) { this.imgc.compressionLevel = 9; }
        if (this.imgc.quality > 100 || this.imgc.quality < 1) { this.imgc.quality = 85; }
        if (!this.imgc.id || this.imgc.id === '') {
            this.imgc.id = this.getGUID();
            this.imgp.conversions.push(this.imgc);
        }
        this.cmode = 1;
    }
    btnDeleteImageConversion() {
        if (!confirm('Do you want to remove this entry?')) { return; }
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.imgp.conversions.length; i++) {
            if (this.imgp.conversions[i] === this.imgc) {
                this.imgp.conversions.splice(i, 1);
                this.imgc = null;
                this.cmode = 1;
                return;
            }
        }
        this.cmode = 1;
    }
}
