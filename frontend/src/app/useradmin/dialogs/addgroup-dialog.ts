import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TabsNavService } from 'src/app/services/tabs.service';
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-addgroupdialog',
    templateUrl: 'addgroup-dialog.html'
})

export class GroupAddDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        private backendSVC: BackendService,
        private tabsSVC: TabsNavService,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    allgroups = [];
    loading = true;
    selectedGroup = '';
    userID: string;

    ngOnInit(): void {
        this.userID = this.data.userID;
        this.backendSVC.cognitoAction('listGroups', {}).then(
            (data: any) => {
                this.allgroups = data.groups || [];
                this.loading = false;
            },
            (err: any) => {
                console.log('Error', err);
                this.tabsSVC.printNotification('Failed to retrieve list of groups!');
            }
        );
    }

    btnDialogConfirm(): void {
        if (!this.userID || this.userID === '') {
            this.tabsSVC.printNotification('UserID is missing');
            return;
        }
        this.backendSVC.cognitoAction('addUserToGroup', { id: this.userID, groupname: this.selectedGroup }).then(
            (data: any) => {
                if (data.success) {
                    this.dialogRef.close(this.selectedGroup);
                } else {
                    this.tabsSVC.printNotification(data.message || 'Failed to add group!');
                }
            },
            (err) => {
                this.tabsSVC.printNotification('Failed to add group!');
                console.log('Error', err);
            }
        );
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
}
