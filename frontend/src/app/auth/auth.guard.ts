import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { WGCCognitoService } from '../services/wgccognito.service';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(
        private cognitoSVC: WGCCognitoService
    ) { }

    canActivate() {
        // Since switching to aws-amplify-angular, this is no longer used.
        if (this.cognitoSVC.signedIn) { return true; }
        console.warn('[AuthGuard] Not logged in');
        return false;
    }
}
