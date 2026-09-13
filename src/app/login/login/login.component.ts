import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IUser } from 'src/app/common/interfaces/user/user.intefrace';
import { Role } from 'src/app/common/enums/role.enum';
import { AuthGuardService } from 'src/app/common/services/authGuard-service/auth-guard.service';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  private readonly userURL: string = 'http://localhost:3000/users/login';
  inputUsernameTxt = "";
  inputPasswordTxt = "";

  allInfoAlert: boolean = false
  wrongUserAlert: boolean = false;
  serverDownAlert: boolean = false;

  username = new FormControl('', Validators.required);
  password = new FormControl('', Validators.required);


  constructor(private router: Router, private httpClient: HttpClient) { }

  ngOnInit() {
    localStorage.clear();
  }


  getUserNameError() {
    if (this.username.hasError('required')) {
      return 'Required';
    }

    return this.username.hasError('username') ? 'Not a valid username' : '';
  }

  getPasswordError() {
    if (this.password.hasError('required')) {
      return 'Required';
    }

    return this.password.hasError('password') ? 'Not a valid password' : '';
  }

  onSubmitCreate() {
    if (this.validateUser()) {
      this.allInfoAlert = true;
      this.wrongUserAlert = false;
      this.serverDownAlert = false;
      // alert("Fill all required info")
    } else {
      this.onSubmitLogin();
    }
  }

  validateUser() {
    if (this.inputUsernameTxt == "" || this.inputPasswordTxt == "") {
      return true;
    } else {
      return false;
    }
  }

  onSubmitLogin() {
    this.httpClient.post<IUser>(this.userURL, { username: this.inputUsernameTxt, password: this.inputPasswordTxt }).subscribe((user: IUser) => {
      localStorage.setItem('UserName', user.username);
      if (user.role === Role.Debrifer) {
        this.router.navigateByUrl('/archive', { state: user });
      } else {
        this.router.navigateByUrl('/live', { state: user });
      }
    },
      (error: HttpErrorResponse) => {
        if (error.error.message != undefined) {
          console.log(error.error.message);
          this.wrongUserAlert = true;
          this.allInfoAlert = false;
          this.serverDownAlert = false;
          // alert(error.error.message);
        } else {
          console.log("user service is down!");
          this.serverDownAlert = true;
          this.wrongUserAlert = false;
          this.allInfoAlert = false;
          // alert("user service is down!")
        }
      });
  }

  switchToRegister() {
    this.router.navigateByUrl('/register');
  }


}
