import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { MTContentDialogComponent } from './dialogs/MTContentDialog';
import { MTSelectDialogComponent } from './dialogs/MTSelectDialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TabsNavService } from 'src/app/services/tabs.service';

@Component({
  selector: 'app-mttable-component',
  templateUrl: './mttable.component.html',
  styleUrls: ['./mttable.component.css']
})

export class MTTableComponent implements OnInit {
  @Input() parentField: any;

  isExpanded: boolean;

  constructor(
    public dialog: MatDialog,
    private tabsSVC: TabsNavService
  ) { }

  ngOnInit() { }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }
  btnEditObj(fldMT) {
    this.dialog.open(MTContentDialogComponent, { width: '800px', disableClose: false, data: { fldMT } });
  }
  btnCopyObj(fldMT) {
    this.tabsSVC.setInternalClipboard( JSON.parse(JSON.stringify(fldMT))); // store dereferenced copy
    this.tabsSVC.printNotification('Object copied to memory. You can now insert it in another position or page.');
  }
  btnPasteObj(pos: any) {
    const cp = this.tabsSVC.getInternalClipboard();
    if (!cp || cp === '') {
      this.tabsSVC.printNotification('No object in memory. You must copy an object to memory first.');
      return;
    }
    if (pos.restrictChilds) {
      // check if parent object accepts pasted object
      if (pos.accepts) {
        if (pos.accepts.indexOf(cp.id) < 0) {
          this.tabsSVC.printNotification('Unable to insert at this position. Object type is not allowed here.');
          return;
        }
      }
    }
    if (!pos.lstObj) { pos.lstObj = []; }
    pos.lstObj.push(cp);
    this.tabsSVC.printNotification('Object inserted.');
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
