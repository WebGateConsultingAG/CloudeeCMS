/*
 * Copyright WebGate Consulting AG, 2021
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

// Version 2021-06-30
// To use this library, add aws-amplify to your dependencies

import { Injectable } from '@angular/core';
import { CognitoUser, Auth } from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { environment } from 'src/environments/environment';

@Injectable()
export class UserLoginService {
  verbose = false;

  isLoggedIn = false;
  username = '';
  fullname = '';
  firstname = '';
  lastname = '';
  email = '';
  groups: any = {
    isAdmin: false,
    isUserAdmin: false,
    isLayoutEditor: false
  };
  sessionUserAttributes: any;
  user!: CognitoUser;
  tmpUser: any; // user without valid session, for NEW_PASSWORD_REQUIRED, MFA etc
  requiredAttributes: any;
  AmplifyAuth = Auth;
  groupsChecked = false;

  public cognitoAllowUserPassLogin: boolean;
  public cognitoAllowOAuthLogin: boolean;
  public federatedLoginLabel: string;

  constructor() {
    this.cognitoAllowUserPassLogin = environment.cognitoAllowUserPassLogin;
    this.cognitoAllowOAuthLogin = environment.cognitoAllowOAuthLogin;
    this.federatedLoginLabel = environment.federatedLoginLabel || 'Single Sign On';
    Hub.listen('auth', this.authListener);
    this.checkLoggedIn();
  }

  public logIn(username: string, pwd: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const user = await Auth.signIn(username, pwd);
        this.tmpUser = user;
        if (this.verbose && user?.challengeName) console.log('[UserLoginService]' + user.challengeName);
        if (user.challengeName === 'SMS_MFA' ||
          user.challengeName === 'SOFTWARE_TOKEN_MFA') {
          // Ask for authenticator/SMS code
          resolve(user.challengeName);
        } else if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
          this.requiredAttributes = user.challengeParam; // the array of required attributes, e.g ['email', 'phone_number']
          resolve(user.challengeName);
          // You need to get the new password and required attributes from the UI inputs
        } else if (user.challengeName === 'MFA_SETUP') {
          // The user needs to setup the TOTP authenticator before using it
        } else {
          // Success, user is logged in
          this.user = user;
          this.extractUserDetails();
          resolve('LoggedIn');
        }
      } catch (err: any) {
        if (err.code === 'UserNotConfirmedException') {
          // The error happens if the user didn't finish the confirmation step when signing up
          // In this case you need to resend the code and confirm the user
        } else if (err.code === 'PasswordResetRequiredException') {
          // The error happens when the password is reset in the Cognito console
          // In this case you need to call forgotPassword to reset the password
        } else if (err.code === 'NotAuthorizedException') {
          // The error happens when the incorrect password is provided
        } else if (err.code === 'UserNotFoundException') {
          // The error happens when the supplied username/email does not exist in the Cognito user pool
        } else {
          console.log('[UserLoginService]', err.code, err);
        }
        reject(err);
      }
    });
  }
  public logout(reloadWindow: boolean): void {
    try {
      console.log('[UserLoginService] Logging out');
      this.username = '';
      this.fullname = '';
      this.email = '';
      this.isLoggedIn = false;
      this.groups.isAdmin = false;
      this.groups.isPowerUser = false;
      this.signOut(reloadWindow);
    } catch (error) {
      console.log('[UserLoginService] Logout failed: ', error);
    }
  }
  async signOut(reloadWindow) {
    try {
      await Auth.signOut({ global: true });
      if (reloadWindow) window.location.reload();
    } catch (error) {
      console.log('[UserLoginService] Error signing out: ', error);
    }
  }
  async checkLoggedIn(): Promise<boolean> {
    try {
      if (this.verbose) console.log('[UserLoginService] Checking session');
      this.user = await Auth.currentAuthenticatedUser();
      if (this.user) this.extractUserDetails();
      return true;
    } catch (e) {
      this.isLoggedIn = false;
      return false;
    }
  }
  extractUserDetails(): void {
    if (this.user) {
      if (this.verbose) console.log('[UserLoginService]', this.user);
      this.username = this.user.getUsername();
      this.fullname = '';
      this.isLoggedIn = true;

      // Read user groups from token payload
      this.extractUserGroups(() => { });

      this.user.getUserAttributes((err, attribs: any) => {
        if (attribs) {
          this.email = attribs.find((attr: any) => attr.Name === 'email')?.Value || '';
          this.firstname = attribs.find((attr: any) => attr.Name === 'given_name')?.Value || '';
          this.lastname = attribs.find((attr: any) => attr.Name === 'family_name')?.Value || '';
          this.fullname = this.firstname + ' ' + this.lastname;
        }
      });
    }
  }
  extractUserGroups(cb): void {
    if (this.groupsChecked) {
      cb(this.groups);
      return;
    }
    Auth.userSession(this.user).then(
      (cogUserSession: any) => {
        let accessToken = cogUserSession.getAccessToken();
        if (accessToken && accessToken.payload) {
          let lstGroups = accessToken.payload['cognito:groups'] || [];
          this.groups.isAdmin = lstGroups.indexOf('CloudeeCMS-Admin') >= 0;
          this.groups.isUserAdmin = lstGroups.indexOf('CloudeeCMS-UserAdmin') >= 0;
          this.groups.isLayoutEditor = lstGroups.indexOf('CloudeeCMS-LayoutEditor') >= 0;
        }
        this.groupsChecked = true;
        cb(this.groups);
      },
      (err: any) => {
        console.log("[UserLoginService] Failed to extract users groups");
        cb(this.groups);
      }
    );
  }
  isSessionValidAuthGuard(cb: any): void {
    // this is for authguard
    Auth.currentAuthenticatedUser().then(
      (data: any) => {
        this.extractUserGroups(
          (groups: any) => {
            cb(true, groups);
          }
        );
      },
      (err: any) => {
        console.log('[UserLoginService]', err);
        cb(false, []);
      }
    );
  }
  public submitTOTPToken(code: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const loggedUser = await Auth.confirmSignIn(this.tmpUser, code, this.tmpUser.challengeName);
        if (this.verbose) console.log("[UserLoginService] loggedUser", loggedUser);
        this.user = loggedUser;
        this.extractUserDetails();
        resolve('LoggedIn');
      } catch (e) {
        reject(e);
      }
    });
  }
  public openFederatedLogin() {
    Auth.federatedSignIn({ customProvider: 'aad' });
  }
  private authListener = (data: any) => {
    if (this.verbose) console.log("[UserLoginService] AuthListener", data);
    switch (data.payload.event) {
      case 'signIn':
        console.info('[UserLoginService] User signed in');
        this.extractUserDetails();
        break;
      case 'signUp':
        console.info('[UserLoginService] User signed up');
        break;
      case 'signOut':
        console.info('[UserLoginService] User signed out');
        break;
      case 'signIn_failure':
        console.error('[UserLoginService] User sign in failed');
        break;
      case 'tokenRefresh':
        console.info('[UserLoginService] Token refresh succeeded');
        break;
      case 'tokenRefresh_failure':
        console.error('[UserLoginService] Token refresh failed');
        break;
      case 'configured':
        console.info('[UserLoginService] Auth module ready');
    }
  }
}
