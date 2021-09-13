import { Component, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { UserLoginService } from '../auth/userlogin.service';

@Component({
  templateUrl: './logindialog.component.html',
  styleUrls: ['./logindialog.component.css']
})

export class LoginDialogComponent {

  processLogin = false;
  loginMessage = '';
  username = '';
  pwd = '';
  newPwd1 = '';
  newPwd2 = '';
  confirmationCode = '';
  authresult = '';
  hidepwd = true;
  MFAStep = '1';
  TOTPIssuer = 'AWS';
  dspTOTPCode = '';
  dspQRCode = '';

  constructor(
    public dialogRef: MatDialogRef<Component>,
    public usrSVC: UserLoginService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  doLogin(): void {
    this.loginMessage = '';
    this.authresult = '';
    this.processLogin = true;
    if (!this.username || this.username === '') return;
    if (!this.pwd || this.pwd === '') return;
    this.usrSVC.logIn(this.username, this.pwd).then(
      (authresult: string) => {
        this.processLogin = false;
        this.authresult = authresult;
        this.pwd = '';
        if (authresult === 'LoggedIn') this.onLoginSuccess();
      },
      (err) => {
        console.log(err);
        this.processLogin = false;
        this.authresult = err.code;
        this.loginMessage = err.message || 'Failed to log in';
      }
    );
  }
  onLoginSuccess(): void {
    localStorage.setItem(environment.lastuservar, this.username);
    this.dialogRef.close({ action: 'success' });
  }
  loginKeyDown(ev: any): void {
    if (ev.keyCode === 13) { this.doLogin(); }
  }
  TOTPKeyDown(ev: any): void {
    if (ev.keyCode === 13) { this.btnSubmitTOTPCode(); }
  }
  doClose(): void {
    this.dialogRef.close({ action: 'cancel' });
  }
  btnConfirmSignupCode(): void {
    this.loginMessage = '';
    this.usrSVC.AmplifyAuth.confirmSignUp(this.username, this.confirmationCode).then(
      (result: string) => {
        this.confirmationCode = '';
        if (result === 'SUCCESS') this.onLoginSuccess();
      },
      (err: any) => {
        console.log(err);
        this.loginMessage = err.message || 'Failed to verify code';
      }
    );
  }
  btnSubmitTOTPCode(): void {
    this.loginMessage = '';
    if (!this.confirmationCode || this.confirmationCode === '') {
      this.loginMessage = 'Please enter the confirmation code!';
      return;
    }
    this.usrSVC.submitTOTPToken(this.confirmationCode).then(
      (authresult: string) => {
        this.confirmationCode = '';
        if (authresult === 'LoggedIn') this.onLoginSuccess();
      },
      (err: any) => {
        console.log(err);
        this.confirmationCode = '';
        this.loginMessage = err.message || 'Failed to log in';
      }
    );
  }
  btnRequestNewConfirmationCde(): void {
    this.loginMessage = '';
    if (!this.username || this.username === '') {
      this.loginMessage = 'Please enter your email address!';
      return;
    }
    this.usrSVC.AmplifyAuth.forgotPassword(this.username)
      .then(() => {
        this.loginMessage = 'New code has been sent';
      })
      .catch(err => {
        console.log(err);
        this.loginMessage = err.message || 'Failed to request code';
      });
  }
  btnForgotPassword(): void {
    this.loginMessage = '';
    if (!this.username || this.username === '') {
      this.loginMessage = 'Please enter your email address!';
      return;
    }
    this.usrSVC.AmplifyAuth.forgotPassword(this.username)
      .then(data => {
        this.authresult = 'PasswordResetRequiredException'; // prompt for code and new pwd
      })
      .catch(err => {
        console.log(err);
        this.loginMessage = err.message || 'Failed to request code';
      });
  }
  btnSubmitPasswordReset(): void {
    // user forgot pwd and needs to change
    this.loginMessage = '';
    if (this.newPwd1 !== this.newPwd2) {
      this.loginMessage = 'Passwords do not match';
      return;
    }
    if (!this.confirmationCode || this.confirmationCode === '') {
      this.loginMessage = 'Please enter the confirmation code!';
      return;
    }
    this.usrSVC.AmplifyAuth.forgotPasswordSubmit(this.username, this.confirmationCode, this.newPwd1)
      .then(result => {
        this.confirmationCode = '';
        this.newPwd1 = '';
        this.newPwd2 = '';
        this.authresult = ''; // back to login screen
      })
      .catch(err => {
        console.log(err);
        this.loginMessage = err.message || 'Failed to complete request';
      });
  }
  btnSubmitNewPassword(): void {
    // new user with temporary password, must change pwd now
    this.loginMessage = '';
    if (this.newPwd1 !== this.newPwd2) {
      this.loginMessage = 'Passwords do not match';
      return;
    }
    this.usrSVC.AmplifyAuth.completeNewPassword(this.usrSVC.tmpUser, this.newPwd1)
      .then(result => {
        this.newPwd1 = '';
        this.newPwd2 = '';
        this.authresult = ''; // back to login screen
      })
      .catch(err => {
        console.log(err);
        this.loginMessage = err.message || 'Failed to set password';
      });
  }

  public btnTOTPSetup(): void {
    // Redirect user to TOTP configuration page
    alert('No TOTP configuration page configured');
  }
}
