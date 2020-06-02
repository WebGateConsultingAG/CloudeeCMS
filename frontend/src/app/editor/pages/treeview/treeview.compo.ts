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

import { Component, OnInit, Input } from '@angular/core';
import { TabsNavService } from 'src/app/services/tabs.service';

@Component({
    selector: 'app-flx-treeview',
    templateUrl: './treeview.compo.html',
    styleUrls: ['./treeview.component.css']
})

export class TreeViewComponent implements OnInit {
    @Input() treeBranch: any;
    @Input() pagelinkprefix: string;
    constructor(
        private tabsSVC: TabsNavService
    ) { }

    ngOnInit() { }

    public branchClick(row: any) {
        if (row.id) { // this is a page without childs
            this.tabsSVC.navigateTo(this.pagelinkprefix + row.id);
        } else { // toggle category
            row.expanded = !row.expanded;
        }
    }
    public toggleExpand(row: any) {
        row.expanded = !row.expanded;
    }
}
