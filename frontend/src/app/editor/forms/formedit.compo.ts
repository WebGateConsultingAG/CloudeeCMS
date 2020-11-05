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
import { Form } from './form';
import { environment } from 'src/environments/environment';


@Component({
    selector: 'app-formedit',
    templateUrl: './formedit.compo.html',
    styles: ['.hint { font-size: 75%; color: rgba(0, 0, 0, 0.6); }']
})

export class FormEditComponent implements OnInit {
    @Input() docid: string;
    @Input() tabid: string;

    constructor(
        private tabsSVC: TabsNavService,
        private backendSVC: BackendService
    ) { }

    loading = true;
    frm: Form;
    tmpAddEmail: string;
    formAPIURL: string;
    hasChanges = false;
    editorTrackChanges = false;

    trumbooptions: any = { // any, because of missing "semantic" prop. in ngx-trumbowyg
        lang: 'en',
        svgPath: 'assets/img/trumbowyg-icons.svg',
        semantic: { div: 'div' }, // prevent converting <div> to <p>
        removeformatPasted: true,
        resetCss: true,
        autogrow: true,
        imageWidthModalEdit: true,
        btns: [
            ['formatting'],
            ['fontsize'],
            ['strong', 'em', 'del'],
            ['link'],
            ['insertImage'],
            ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
            ['unorderedList', 'orderedList'],
            ['horizontalRule'],
            ['removeformat'],
            ['viewHTML'],
            ['fullscreen']
        ],
        events: {}
        /*plugins: environment.trumbooptions.plugins*/
    };
    ngOnInit() {
        const that = this;
        this.formAPIURL = environment.API_Gateway_Endpoint + '/user-forms';
        if (this.docid === 'NEW') {
            this.frm = new Form();
            this.frm.staticcaptcha = that.tabsSVC.getGUID();
            this.tabsSVC.setTabTitle(this.tabid, 'New Form');
            this.loading = false;
            setTimeout(() => { that.setLoading(false); }, 1000); // delay to prevent error
            // enable trumbowyg editor onchange tracking
            setTimeout(() => { that.editorTrackChanges = true; }, 2000);
        } else {
            this.loadByID(this.docid);
        }
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
                // enable trumbowyg editor onchange tracking
                setTimeout(() => { that.editorTrackChanges = true; }, 2000);
            },
            (err) => {
                that.tabsSVC.printNotification('Error while loading form');
                that.setLoading(false);
            }
        );
    }

    saveDocument() {
        const that = this;
        this.setLoading(true);
        this.backendSVC.saveForm(this.frm).then(
            (data: any) => {
                if (that.frm.id !== data.id) { // first save of NEW doc
                    that.tabsSVC.changeTabID(that.tabid, 'tab-form-' + data.id, data.id);
                    that.tabid = 'tab-form-' + data.id;
                    that.docid = data.id;
                }
                that.frm.id = data.id;
                that.setLoading(false);
                that.tabsSVC.setTabDataExpired('tab-forms', true);
                if (data.success) {
                    that.tabsSVC.printNotification('Document saved');
                    that.setHasChanges(false);
                }
            },
            (err) => {
                that.tabsSVC.printNotification('Error while saving layout');
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
                    that.tabsSVC.printNotification('Document deleted');
                    that.tabsSVC.setTabDataExpired('tab-forms', true);
                    that.tabsSVC.closeTabByID(that.tabid);
                }
            },
            (err) => {
                that.tabsSVC.printNotification('Error while deleting');
                that.setLoading(false);
            }
        );
    }
    btnAddEmail() {
        if (this.tmpAddEmail !== '') {
            if (!this.frm.lstEmail) { this.frm.lstEmail = []; }
            this.frm.lstEmail.push(this.tmpAddEmail);
            this.tmpAddEmail = '';
        }
        this.setHasChanges(true);
    }
    btnRemoveEmail(delItem: string) {
        for (let i = 0; i < this.frm.lstEmail.length; i++) {
            if (this.frm.lstEmail[i] === delItem) {
                this.frm.lstEmail.splice(i, 1);
                return;
            }
        }
        this.setHasChanges(true);
    }
    setHasChanges(hasChanges): void {
        if (this.hasChanges !== hasChanges) {
            this.tabsSVC.setTabHasChanges(this.tabid, hasChanges);
            this.hasChanges = hasChanges;
        }
    }
    setEditorHasChanges(): void {
        // this event is muted by setTimeout for the first few seconds, editor triggers ngModelChange at least 2 times on startup
        // editors own 'onchange' events are unavailable in ngx-trumbowyg wrapper
        if (this.editorTrackChanges) {
            if (this.hasChanges !== true) {
                this.tabsSVC.setTabHasChanges(this.tabid, true);
                this.hasChanges = true;
            }
        }
    }
    setLoading(on: boolean) {
        this.loading = on;
        this.tabsSVC.setLoading(on);
    }
}
