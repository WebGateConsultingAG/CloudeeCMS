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
        const that = this;
        this.userID = this.data.userID;
        this.backendSVC.cognitoListGroups().then(
            (data: any) => {
                that.allgroups = data.groups || [];
                that.loading = false;
            },
            (err) => {
                console.log('Error', err);
                that.tabsSVC.printNotification('Failed to retrieve list of groups!');
            }
        );
    }

    btnDialogConfirm(): void {
        if (!this.userID || this.userID === '') {
            this.tabsSVC.printNotification('UserID is missing');
            return;
        }
        const that = this;
        this.backendSVC.cognitoAddUserToGroup(this.userID, this.selectedGroup).then(
            (data: any) => {
                if (data.success) { that.dialogRef.close(that.selectedGroup); }
            },
            (err) => {
                that.tabsSVC.printNotification('Failed to add group!');
                console.log('Error', err);
            }
        );
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
}
