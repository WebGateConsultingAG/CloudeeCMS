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

import { Injectable, ApplicationRef, ChangeDetectorRef } from '@angular/core';
// import { AmplifyService } from '@aws-amplify/ui-angular';
import { onAuthUIStateChange, CognitoUserInterface, AuthState } from '@aws-amplify/ui-components';
import { Auth } from '@aws-amplify/auth';
import { environment } from '../../environments/environment';

@Injectable()
export class WGCCognitoService {

    public signedIn = false;
    public username = '';
    public user: any;
    public cognitoAllowUserPassLogin: boolean;
    public cognitoAllowOAuthLogin: boolean;
    public federatedLoginLabel: string;
    public authState: AuthState;

    constructor(
        //private app: ApplicationRef,
     //   private ref: ChangeDetectorRef
   //     private amplifyService: AmplifyService
    ) {
        this.cognitoAllowUserPassLogin = environment.cognitoAllowUserPassLogin;
        this.cognitoAllowOAuthLogin = environment.cognitoAllowOAuthLogin;
        this.federatedLoginLabel = environment.federatedLoginLabel || 'Single Sign On';
        /*this.amplifyService.authStateChange$.subscribe((authState) => {
            console.log('authState', authState);
            // if (!authState.user || typeof authState.user.username === 'undefined') {
            if (authState.state === 'signedIn' || (authState.state === 'cognitoHostedUI' && authState.user ) ) {
                this.user = authState.user;
                this.username = this.user.username;
                this.signedIn = true;
            } else {
                this.signedIn = false;
                this.user = null;
            }
            app.tick(); // update angular UI
        });*/
        onAuthUIStateChange((authState, authData) => {
            this.authState = authState;
            this.user = authData as CognitoUserInterface;
         //   this.ref.detectChanges();
          })
    }

    logout() {
        Auth.signOut();
        window.location.reload();
    }

    openFederatedLogin() {
        Auth.federatedSignIn();
    }
}
