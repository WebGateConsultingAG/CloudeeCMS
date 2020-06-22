import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { MTContentDialogComponent } from './dialogs/MTContentDialog';
import { MTSelectDialogComponent } from './dialogs/MTSelectDialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-mttable-component',
  templateUrl: './mttable.component.html',
  styleUrls: ['./mttable.component.css']
})

export class MTTableComponent implements OnInit {
  @Input() parentField: any;

  isExpanded: boolean;

  constructor(
    public dialog: MatDialog
  ) { }

  ngOnInit() { }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }
  btnEditObj(fldMT) {
    this.dialog.open(MTContentDialogComponent, { width: '800px', disableClose: false, data: { fldMT } });
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
  btnDeleteObj(lst, fldMT, idx) {
    if (!confirm('Do you really want to delete \'' + fldMT.title + '\'?')) { return; }
    lst.splice(idx, 1);
  }
  dropSortObj(lst, event: CdkDragDrop<string[]>) {
    moveItemInArray(lst, event.previousIndex, event.currentIndex);
  }
}
