import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Observable } from 'rxjs';
import { TabsNavService } from '../services/tabs.service';
import { UserLoginService } from './userlogin.service';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(
        private userLoginSVC: UserLoginService,
        private tabSVC: TabsNavService
    ) { }

    public canActivate(): boolean | Observable<boolean> {
        return new Observable<boolean>((observer) => {
            this.userLoginSVC.isSessionValidAuthGuard((isAuth: boolean, groups: any) => {
                observer.next(isAuth);
                observer.complete();

                if (!isAuth) this.tabSVC.showLoginForm({ onSuccessReload: true });
            });
        });
    }
}
