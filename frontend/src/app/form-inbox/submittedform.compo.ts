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
import { BackendService } from 'src/app/services/backend.service';
import { TabsNavService } from 'src/app/services/tabs.service';

@Component({
    selector: 'app-submittedform',
    templateUrl: './submittedform.compo.html'
})

export class SubmittedFormComponent implements OnInit {
    @Input() docid: string;
    @Input() tabid: string;

    constructor(
        private tabsSVC: TabsNavService,
        private backendSVC: BackendService
    ) { }

    loading = true;
    frm: any;
    readonly = true;

    ngOnInit() {
        this.loadByID(this.docid);
    }

    loadByID(id: string) {
        const that = this;
        this.backendSVC.getItemByID(id).then(
            (data: any) => {
                if (data.item) {
                    that.frm = data.item;
                    that.tabsSVC.setTabTitle(that.tabid, data.item.title || 'Untitled Form');
                }
                that.setLoading(false);
            },
            (err) => {
                that.tabsSVC.printNotification('Error while loading form');
                that.setLoading(false);
            }
        );
    }

    btnNavigateTo(npath: string): void {
        this.tabsSVC.navigateTo(npath);
    }

    btnDelete() {
        if (!confirm('Do you really want to delete this object?')) { return false; }
        const that = this;
        this.backendSVC.deleteItemByID(this.frm.id).then(
            (data: any) => {
                if (data.success) {
                    that.tabsSVC.setTabDataExpired('tab-formsinbox', true);
                    that.tabsSVC.printNotification('Document deleted');
                    that.tabsSVC.closeTabByID(that.tabid);
                }
            },
            (err) => {
                that.tabsSVC.printNotification('Error while deleting');
                that.setLoading(false);
            }
        );
    }
    setLoading(on: boolean) {
        this.loading = on;
        this.tabsSVC.setLoading(on);
    }
    sortFormFields(a: any, b: any) {
        return a.key > b.key ? 1 : -1;
    }
}
