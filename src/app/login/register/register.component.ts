import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, Injectable, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Role } from 'src/app/common/enums/role.enum';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})

@Injectable()
export class RegisterComponent implements OnInit {

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
  }

  selects: Array<{ type: Role, name: string }> =
    [
      { type: Role.Debrifer, name: 'Debrifer' },
      { type: Role.Pilot, name: 'Pilot' }
    ];

  inputUsernameTxt = "";
  inputPasswordTxt = "";
  inputEmaildTxt = "";

  allInfoAlert: boolean = false
  wrongUserAlert: boolean = false;
  serverDownAlert: boolean = false;

  selectRole: Role;

  username = new FormControl('', [Validators.required, Validators.minLength(3)]);
  password = new FormControl('', [Validators.required, Validators.minLength(5)]);
  email = new FormControl('', [Validators.required, Validators.email]);
  type = new FormControl('', Validators.required);

  getUserNameError() {
    if (this.username.hasError('required')) {
      return 'Required';
    }

    return this.username.hasError('username') ? '' : 'Username must have at least 3 characters';
  }

  getPasswordError() {
    if (this.password.hasError('required')) {
      return 'Required';
    }

    return this.password.hasError('password') ? '' : 'Password must have at least 5 characters';
  }

  getEmailError() {
    if (this.email.hasError('required')) {
      return 'Required';
    }

    return this.email.hasError('email') ? 'Not a valid email' : '';
  }

  onSubmitCreate() {
    if (this.validateUser()) {
      this.allInfoAlert = true;
      this.wrongUserAlert = false;
      this.serverDownAlert = false;
      // alert("Fill all required info")
    } else {
      this.sendRequest();
    }
  }

  validateUser() {
    if (this.inputUsernameTxt == "" || this.inputPasswordTxt == "" || this.inputEmaildTxt == "" || this.selectRole == null) {
      return true;
    } else {
      return false;
    }
  }

  sendRequest() { //send http request to nests
    this.http.post('http://localhost:3000/users', {
      username: this.inputUsernameTxt,
      password: this.inputPasswordTxt,
      email: this.inputEmaildTxt,
      role: this.selectRole
    }).subscribe((res) => {
      console.log(res);
      this.router.navigateByUrl('/login');
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

  switchToLogin() {
    this.router.navigateByUrl('/login');
  }

}
