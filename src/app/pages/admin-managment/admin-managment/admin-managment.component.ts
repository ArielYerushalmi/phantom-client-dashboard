import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { updateUserDTO } from 'src/app/common/dtos/user/updateUser.dto';
import { Role } from 'src/app/common/enums/role.enum';
import { IUser } from 'src/app/common/interfaces/user/user.intefrace';

@Component({
  selector: 'app-admin-managment',
  templateUrl: './admin-managment.component.html',
  styleUrls: ['./admin-managment.component.scss']
})
export class AdminManagmentComponent implements OnInit {

  // inputPasswordTxt = "";


  constructor(private httpClient: HttpClient) { }

  private readonly userURL: string = 'http://localhost:3000/users';

  displayedColumns: string[] = ['name', 'role', 'deleteUser'];
  dataSource = new MatTableDataSource<IUser>();

  updatePopUp: boolean = false;
  deletePopUp: boolean = false;
  user: IUser;
  selectRole: Role;
  adminUsername: string;
  // selectPassword: string;
  // validatePassowrd: string

  selects: Array<{ type: Role, name: string }> =
    [
      { type: Role.ADMIN, name: 'Admin' },
      { type: Role.Debrifer, name: 'Debrifer' },
      { type: Role.Pilot, name: 'Pilot' }
    ];

  // password = new FormControl('', Validators.required);
  selectPassword = new FormControl('', [Validators.required, Validators.maxLength(20), Validators.minLength(5)]);
  confirmPassword = new FormControl('', [Validators.required]);
  passwordToSend: string;
  isPasswordMatch: boolean = true;

  ngOnInit(): void {
    this.adminUsername = window.localStorage.getItem('UserName');
    this.getAllUsers()
  }

  selectPasswordError() {
    if (this.selectPassword.hasError('required')) {
      return 'Required';
    }

    return this.selectPassword.hasError('selectPassword') ? 'Not a valid password' : 'Not a valid password';
  }

  confirmPasswordError() {
    if (this.confirmPassword.hasError('required')) {
      return 'Required';
    }
  }

  getAllUsers() {
    this.httpClient.get<IUser[]>(this.userURL).subscribe((users: IUser[]) => {
      this.dataSource.data = users
    })
  }

  editUserPopUpToggle(user?: IUser) {
    this.updatePopUp = !this.updatePopUp;
    if (user) {
      this.user = user
    }
    if (!this.updatePopUp) {
      this.selectPassword = new FormControl('', [Validators.required, Validators.maxLength(20), Validators.minLength(5)]);
      this.confirmPassword = new FormControl('', [Validators.required]);
      this.selectRole = undefined;
    }
  }

  validation(): boolean {
    if (!this.selectPassword.invalid && !this.confirmPassword.invalid && this.selectPassword.value == this.confirmPassword.value) {
      this.passwordToSend = this.selectPassword.value;
      return true;
    }
  }

  updateUser() {
    if (this.validation()) {
      this.isPasswordMatch = true;
      let userToUpdate: updateUserDTO = new updateUserDTO(this.passwordToSend, this.selectRole);
      this.httpClient.patch(`${this.userURL}/${this.user.username}`, userToUpdate).subscribe(data => {
        console.log("updated user: ", data);
        this.getAllUsers()
        this.editUserPopUpToggle()
      })
    } else {
      this.isPasswordMatch = false;
    }
  }

  deleteUserPopUpToggle(user?: IUser) {
    this.deletePopUp = !this.deletePopUp;
    if (user) {
      this.user = user
    }
  }

  deleteUser() {
    this.httpClient.delete(`${this.userURL}/${this.user.username}`).subscribe(data => {
      this.getAllUsers()
      this.deleteUserPopUpToggle()
    })
  }

}
