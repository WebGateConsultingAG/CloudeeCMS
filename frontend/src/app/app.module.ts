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

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { HomeComponent } from './home/home.compo';
import { LayoutsComponent } from './editor/layouts/layouts.compo';
import { PagesComponent } from './editor/pages/pages.compo';
import { SettingsComponent } from './settings/settings.compo';
import { LayoutEditComponent } from './editor/layouts/layoutedit.compo';
import { PageEditComponent } from './editor/pages/pageedit.compo';
import { BackendService } from './services/backend.service';
import { FileAdminService } from './services/fileadmin.service';

import { PugBlocksComponent } from './editor/layoutblocks/pugblocks.compo';
import { PugBlockEditComponent } from './editor/layoutblocks/pugblockedit.compo';
import { PublishDialogComponent } from './editor/pages/dialogs/PublishDialog';
import { ListFilesComponent } from './editor/fileexplorer/listfiles.compo';
import { OrderByPipe } from './utils/OrderBy.Pipe';
import { TreeViewComponent } from './editor/pages/treeview/treeview.compo';
import { LayoutFieldDialogComponent } from './editor/layouts/dialogs/layoutfield.dialog';
import { FileUploadDialogComponent } from './editor/fileexplorer/fileuploader/FileUploadDialog';
import { MTListComponent } from './editor/microtemplates/mtlist.compo';
import { MTEditComponent } from './editor/microtemplates/mtedit.compo';
import { MTSelectDialogComponent } from './editor/pages/dialogs/MTSelectDialog';
import { MTContentDialogComponent } from './editor/pages/dialogs/MTContentDialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxTrumbowygModule } from 'ngx-trumbowyg';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TabsNavService } from './services/tabs.service';
import { AuthGuard } from './auth/auth.guard';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MyHttpInterceptor } from './auth/myhttpinterceptor';
import { MyProfileComponent } from './useradmin/myprofile.compo';
import { UserListComponent } from './useradmin/userlist.compo';
import { UserProfileDialogComponent } from './useradmin/dialogs/userprofile.dialog';
import { NewUserProfileDialogComponent } from './useradmin/dialogs/newuserprofile.dialog';
import { PubQueueComponent } from './editor/publication/pubqueue.compo';
import { BulkPublishDialogComponent } from './editor/publication/dialogs/BulkPublishDialog';
import { PublishLogDialogComponent } from './editor/publication/dialogs/PublishLogDialog';
import { AboutDialogComponent } from './settings/AboutDialog';
import { CFInvalidationDialogComponent } from './editor/publication/dialogs/CFInvalidationDialog';
import { FormsComponent } from './editor/forms/forms.compo';
import { FormEditComponent } from './editor/forms/formedit.compo';
import { BucketEditDialogComponent } from './settings/dialogs/bucketedit-dialog';
import { CFDistEditDialogComponent } from './settings/dialogs/cfdistedit-dialog';
import { FormsInboxComponent } from './form-inbox/formsinbox.compo';
import { SubmittedFormComponent } from './form-inbox/submittedform.compo';
import { SearchFilterPipe } from './utils/searchfilterpipe';
import { BookmarkEditDialogComponent } from './settings/dialogs/bookmarkedit-dialog';
// import { AmplifyAngularModule, AmplifyService, AmplifyModules } from 'aws-amplify-angular';
import { AmplifyUIAngularModule } from "@aws-amplify/ui-angular";
import { Auth } from '@aws-amplify/auth';
import { Interactions } from '@aws-amplify/interactions';
import { WGCCognitoService } from './services/wgccognito.service';
import { PasswordChangeDialogComponent } from './useradmin/dialogs/pwdchange-dialog';
import { ImportDialogComponent } from './settings/dialogs/restore-dialog';
import { GroupAddDialogComponent } from './useradmin/dialogs/addgroup-dialog';
import { UpdaterDialogComponent } from './settings/dialogs/updater-dialog';
import { FileSelectionDialogComponent } from './editor/pages/dialogs/FileSelectionDialog';
import { VariableEditDialogComponent } from './settings/dialogs/variableedit-dialog';
import { MTTableComponent } from './editor/pages/mttable.component';
import { FileEditorComponent } from './editor/fileexplorer/fileeditor/fileeditor.compo';
import { PackageUploadDialogComponent } from './settings/dialogs/pkgupload-dialog';
import { FileBrowserService } from './services/filebrowser.service';
import { GlobalFunctionEditDialogComponent } from './settings/dialogs/fnedit-dialog';
import { ImageProfileEditDialogComponent } from './settings/dialogs/imgprofileedit-dialog';
import { ImgUploadDialogComponent } from './editor/fileexplorer/imageuploader/ImgUploadDialog';
import { FeedEditDialogComponent } from './settings/dialogs/feededit-dialog';
import { FeedPublishDialogComponent } from './editor/publication/dialogs/FeedPublishDialog';
import { IconSelectDialogComponent } from './editor/microtemplates/dialogs/IconSelectDialog';

@NgModule({
  declarations: [
    AppComponent,
    FormsComponent,
    FormsInboxComponent,
    FileEditorComponent,
    SubmittedFormComponent,
    FormEditComponent,
    CFInvalidationDialogComponent,
    FeedPublishDialogComponent,
    PubQueueComponent,
    SearchFilterPipe,
    GroupAddDialogComponent,
    UserProfileDialogComponent,
    BulkPublishDialogComponent,
    PackageUploadDialogComponent,
    ImageProfileEditDialogComponent,
    BookmarkEditDialogComponent,
    FeedEditDialogComponent,
    VariableEditDialogComponent,
    NewUserProfileDialogComponent,
    BucketEditDialogComponent,
    IconSelectDialogComponent,
    MyProfileComponent,
    UserListComponent,
    HomeComponent,
    LayoutsComponent,
    LayoutEditComponent,
    PugBlocksComponent,
    PugBlockEditComponent,
    PageEditComponent,
    PagesComponent,
    MTListComponent,
    MTEditComponent,
    PublishLogDialogComponent,
    SettingsComponent,
    UpdaterDialogComponent,
    AboutDialogComponent,
    FileSelectionDialogComponent,
    ListFilesComponent,
    MTTableComponent,
    PublishDialogComponent,
    MTSelectDialogComponent,
    MTContentDialogComponent,
    CFDistEditDialogComponent,
    FileUploadDialogComponent,
    ImgUploadDialogComponent,
    LayoutFieldDialogComponent,
    PasswordChangeDialogComponent,
    GlobalFunctionEditDialogComponent,
    ImportDialogComponent,
    OrderByPipe,
    TreeViewComponent
  ],
  imports: [
    DragDropModule,
    BrowserModule,
    FormsModule,
    // AmplifyAngularModule,
    AmplifyUIAngularModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatListModule,
    MatAutocompleteModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatRadioModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatGridListModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatMenuModule,
    MatSlideToggleModule,
    NgxTrumbowygModule
  ],
  entryComponents: [ // dynamic loadable compos using tag-names
    AboutDialogComponent,
    FileEditorComponent,
    IconSelectDialogComponent,
    GroupAddDialogComponent,
    UserProfileDialogComponent,
    NewUserProfileDialogComponent,
    PackageUploadDialogComponent,
    BulkPublishDialogComponent,
    CFInvalidationDialogComponent,
    FeedPublishDialogComponent,
    CFDistEditDialogComponent,
    BucketEditDialogComponent,
    PublishLogDialogComponent,
    BookmarkEditDialogComponent,
    FeedEditDialogComponent,
    VariableEditDialogComponent,
    PasswordChangeDialogComponent,
    ImageProfileEditDialogComponent,
    ImportDialogComponent,
    MyProfileComponent,
    UserListComponent,
    HomeComponent,
    SettingsComponent,
    MTTableComponent,
    FormsComponent,
    FormsInboxComponent,
    SubmittedFormComponent,
    FormEditComponent,
    LayoutsComponent,
    LayoutEditComponent,
    PagesComponent,
    PublishDialogComponent,
    LayoutFieldDialogComponent,
    UpdaterDialogComponent,
    FileUploadDialogComponent,
    ImgUploadDialogComponent,
    MTSelectDialogComponent,
    MTContentDialogComponent,
    GlobalFunctionEditDialogComponent,
    PubQueueComponent,
    FileSelectionDialogComponent
  ],
  providers: [
    BackendService,
    FileAdminService,
    FileBrowserService,
    TabsNavService,
    //AmplifyService,
    WGCCognitoService,
    /*{
      provide: AmplifyService,
      useFactory: () => {
        return AmplifyModules({
          Auth,
          Interactions
        });
      }
    },*/
    AuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: MyHttpInterceptor, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
