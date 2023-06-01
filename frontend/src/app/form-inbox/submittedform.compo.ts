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
        this.backendSVC.actionContent('getItemByID', { id }).then(
            (data: any) => {
                if (data.success) {
                    this.frm = data.item;
                    this.tabsSVC.setTabTitle(this.tabid, data.item.title || 'Untitled Form');
                } else {
                    this.tabsSVC.printNotification(data.message || 'Error while loading form');
                }
                this.setLoading(false);
            },
            (err: any) => {
                this.tabsSVC.printNotification('Error while loading form');
                this.setLoading(false);
            }
        );
    }

    btnNavigateTo(npath: string): void {
        this.tabsSVC.navigateTo(npath);
    }

    btnDelete() {
        if (!confirm('Do you really want to delete this object?')) return false;
        this.backendSVC.actionContent('deleteItemByID', { id: this.frm.id }).then(
            (data: any) => {
                if (data.success) {
                    this.tabsSVC.setTabDataExpired('tab-formsinbox', true);
                    this.tabsSVC.printNotification('Document deleted');
                    this.tabsSVC.closeTabByID(this.tabid);
                } else {
                    this.tabsSVC.printNotification(data.message || 'Error while deleting');
                }
            },
            (err: any) => {
                this.tabsSVC.printNotification('Error while deleting');
                this.setLoading(false);
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
