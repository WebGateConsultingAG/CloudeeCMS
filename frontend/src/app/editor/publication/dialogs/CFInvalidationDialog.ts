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
    selector: 'app-cf-invalidation-dialog',
    templateUrl: 'CFInvalidationDialog.html'
})

export class CFInvalidationDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private backendSVC: BackendService,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    paths: string;
    loading: boolean;
    success: boolean;
    selectedTargetCF: string;
    errorMessage: string;
    cfdists: any = [];

    ngOnInit(): void {
        if (this.data.opaths && this.data.opaths.length > 0) {
            this.paths = this.data.opaths.join('\n');
        } else {
            this.paths = '/*';
        }
        this.cfdists = this.data.cfdists;
    }

    btnSubmit(): void {
        if (!this.selectedTargetCF || this.selectedTargetCF === '') { return; }
        const that = this;
        this.errorMessage = '';
        this.success = false;
        const lst = this.paths.split('\n');
        this.backendSVC.invalidateCF(this.selectedTargetCF, lst).then(
            (data: any) => {
                that.success = data.success;
                if (data.errorMessage) { that.errorMessage = data.errorMessage; }
                that.loading = false;
            },
            (err) => {
                console.error(err);
                that.errorMessage = err.message || 'Error while submitting request';
                that.loading = false;
            }
        );
    }

    btnCancel(): void {
        this.dialogRef.close(null);
    }

}
