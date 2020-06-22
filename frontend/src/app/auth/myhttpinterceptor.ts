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
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from '@aws-amplify/auth';

@Injectable()
export class MyHttpInterceptor implements HttpInterceptor {
  constructor() { }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // only intercept requests towards API-GW
    if (req.url.search(environment.API_Gateway_Endpoint) === -1) {
      return next.handle(req);
    } else {

      return from(Auth.currentSession()).pipe(
        switchMap(data => {
          const headers = req.headers.set('Authorization', data.getIdToken().getJwtToken());
          const requestClone = req.clone({ headers });
          return next.handle(requestClone);
        })
      );
    }
  }
}
