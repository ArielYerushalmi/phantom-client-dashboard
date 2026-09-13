import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Role } from '../../enums/role.enum';
import { HttpClient } from '@angular/common/http';
import { IUser } from '../../interfaces/user/user.intefrace';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  private readonly userURL: string = 'http://localhost:3000/users';

  isLoggIn: boolean = false;
  userRole: Role;

  roleAuth = {
    Pilot: "live",
    Debrifer: "archive"
  }

  constructor(private httpClient: HttpClient) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    let username: string = localStorage.getItem('UserName')
    return this.httpClient.get<IUser>(`${this.userURL}/${username}`).toPromise().then((user: IUser) => {
      this.userRole = user.role;
      if (route.url[0].path == this.roleAuth[user.role] || user.role === Role.ADMIN) {
        return true;
      }
      return false;
    })
  }
}
