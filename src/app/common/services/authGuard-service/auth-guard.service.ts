import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Role } from '../../enums/role.enum';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

  constructor(private httpClient: HttpClient, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    let username: string = localStorage.getItem('UserName')
    if (!username) {
      this.router.navigateByUrl('/login');
      return Promise.resolve(false);
    }

    return this.httpClient.get<IUser>(`${this.userURL}/${username}`).toPromise().then((user: IUser) => {
      this.userRole = user.role;
      if (route.url[0].path == this.roleAuth[user.role] || user.role === Role.ADMIN) {
        return true;
      }
      return false;
    }).catch((error: HttpErrorResponse) => {
      // Without this, a downed user service (or an unknown/expired username) rejected
      // the guard's promise and left the router hanging instead of sending the user
      // back to login.
      if (error.error?.message != undefined) {
        console.log(error.error.message);
      } else {
        console.log("user service is down!");
      }
      this.router.navigateByUrl('/login');
      return false;
    });
  }
}
