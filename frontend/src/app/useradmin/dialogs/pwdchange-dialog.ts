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

import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Auth } from 'aws-amplify';

@Component({
    selector: 'app-newpassword',
    templateUrl: './pwdchange-dialog.html'
})
export class PasswordChangeDialogComponent implements OnInit {

    errorMessage: string;
    pwdChangeDone: boolean;
    hidepwd = true;
    inProgress = false;

    existingPassword: string;
    password: string;
    pwdrepeat: string;

    constructor(
        public dialogRef: MatDialogRef<Component>
    ) { }

    ngOnInit() {
        this.pwdChangeDone = false;
        this.errorMessage = null;
    }

    btnSubmitPwdChange() {
        const that = this;
        this.errorMessage = null;

        if (!this.existingPassword || this.existingPassword === '' || !this.password || this.password === '') {
            this.errorMessage = 'Please fill in all the fields!';
            return;
        }
        if (this.password !== this.pwdrepeat) {
            this.errorMessage = 'New passwords do not match!';
            return;
        }

        that.inProgress = true;
        Auth.currentAuthenticatedUser()
        .then(user => {
            return Auth.changePassword(user, that.existingPassword, that.password);
        })
        .then(data => {
            that.inProgress = false;
            console.log(data);
            that.pwdChangeDone = true;
        })
        .catch(err => {
            that.inProgress = false;
            console.log(err);
            that.errorMessage = err.message || 'Unable to change password';
        });
    }

    btnClose() {
        this.dialogRef.close(null);
    }

}
