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

@Component({
    selector: 'app-iconselect-dialog',
    templateUrl: 'IconSelectDialog.html',
    styleUrls: ['IconSelectDialog.css']
})

export class IconSelectDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>,
        @Inject(MAT_DIALOG_DATA) public data: any) { }

    viewFilter = '';
    selectionText = '';
    customIcon = '';
    useCustomIcon = false;
    lstIcons = ['image', 'photo_camera', 'panorama_wide_angle', 'ondemand_video', 'movie', 'featured_video',
        'featured_play_list', 'dashboard', 'art_track', 'call_to_action', 'account_box', 'account_circle', 'person',
        'all_inbox', 'analytics', 'anchor', 'announcement', 'article', 'aspect_ratio', 'assignment', 'assignment_late',
        'backup_table', 'backup', 'book', 'book_online', 'bookmark_border', 'build', 'calendar_today', 'calendar_view_day',
        'chrome_reader_mode', 'code', 'contact_support', 'copyright', 'contactless', 'credit_card', 'description', 'dns',
        'dynamic_form', 'explore', 'extension', 'fact_check', 'feedback', 'find_in_page', 'flip_to_bacl', 'flip_to_front',
        'get_app', 'grade', 'grading', 'group_work', 'help_center', 'highlight_alt', 'home', 'horizontal_split',
        'hourglass_empty', 'https', 'important_devices', 'info', 'input', 'integration_instructions', 'line_style',
        'line_weight', 'launch', 'language', 'label', 'leaderboard', 'list', 'pageview', 'picture_in_picture',
        'picture_in_picture_alt', 'reorder', 'report_problem', 'room', 'rule', 'schedule', 'search', 'settings',
        'shop', 'shopping_cart', 'source', 'subject', 'star_rate', 'tab', 'tab_unselected', 'toc',
        'theaters', 'thumb_up', 'timeline', 'tour', 'vertical_split', 'view_agenda', 'view_array',
        'view_carousel', 'view_column', 'view_list', 'view_module', 'view_quilt', 'view_sidebar', 'view_stream', 'view_week',
        'wysiwyg', 'grid_on', 'gradient', 'panorama', 'view_comfy', 'straighten', 'edit_attributes', 'train',
        'my_location', 'apps', 'home_work', 'account_tree', 'phone_in_talk', ''
    ];
    ngOnInit(): void {
        this.selectionText = this.data.selectionText || '';
    }
    btnCancel(): void {
        this.dialogRef.close(null);
    }
    btnAdd(): void {
        if (this.customIcon === '') { return; }
        this.dialogRef.close({ icon: this.customIcon, action: 'add' });
    }
    selectIcon(sIcon: any): void {
        this.dialogRef.close({ icon: sIcon, action: 'add' });
    }
}
