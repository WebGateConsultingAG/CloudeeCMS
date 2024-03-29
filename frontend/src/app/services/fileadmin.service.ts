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

import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpRequest, HttpEventType, HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class FileAdminService {

    constructor(private http: HttpClient) { }

    FILE_RES = '/file-admin';
    IMG_RES = '/img-resize';

    // Authentication token will be added by MyHttpInterceptor (see modules)

    public fileAdminAction(action: string, params: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.FILE_RES, { action, params }).toPromise().then((result: any) => {
            return result || null;
        });
    }

    public upload(files: Set<File>, s3uploadPath: string, s3policy: any, CCMaxAge: string): { [key: string]: Observable<number> } {
        const status = {}; // observables map
        let maxAge = CCMaxAge;
        if (!maxAge || maxAge === '') { maxAge = '259200'; }
        files.forEach(file => {
            const formData: FormData = new FormData();
            formData.append('Content-Type', file.type);
            for (const f in s3policy.fields) { formData.append(f, s3policy.fields[f]); } // inherit all fields from policy
            formData.append('ACL', 'public-read'); // must appear before file contents!
            formData.append('Cache-Control', 'max-age=' + maxAge);
            const targetFilename = s3uploadPath + file.name;
            console.log('upload', targetFilename);
            formData.append('key', targetFilename);
            formData.append('file', file); // , file.name);

            const req = new HttpRequest('POST', s3policy.url, formData, { reportProgress: true });
            const progress = new Subject<number>();

            // IMPORTANT: exclude POST upload URL from httpinterceptor!!
            this.http.request(req).subscribe(event => {
                if (event.type === HttpEventType.UploadProgress) {
                    const percentDone = Math.round((100 * event.loaded) / event.total);
                    progress.next(percentDone); // update progress bar
                } else if (event instanceof HttpResponse) {
                    progress.complete(); // done uploading this file
                }
            });

            status[file.name] = {
                progress: progress.asObservable(),
                s3key: targetFilename,
                nm: file.name
            };
        });
        return status;
    }

    // Image resizer
    public resizeImages(thisBucketName: string, targetpath: string, lstFiles: any, imageprofile: any) {
        return this.http.post(environment.API_Gateway_Endpoint + this.IMG_RES,
            { action: 'convertimages', bucketName: thisBucketName, targetpath, lstFiles, imageprofile }).toPromise().then((result: any) => {
                return result || null;
            });
    }

    public getNewGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
            // tslint:disable-next-line: no-bitwise one-variable-per-declaration
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

}
