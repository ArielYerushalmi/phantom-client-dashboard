import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Role } from "src/app/common/enums/role.enum";
import { IUser } from "src/app/common/interfaces/user/user.intefrace";
import { AuthGuardService } from "src/app/common/services/authGuard-service/auth-guard.service";

declare interface RouteInfo {
  path: string;
  title: string;
  rtlTitle: string;
  icon: string;
  class: string;
}
export const ROUTES: RouteInfo[] = [
  {
    path: "/live",
    title: "Live",
    rtlTitle: "live",
    icon: "live_tv",
    // icon: "icon-triangle-right-17",
    class: ""
  },
  {
    path: "/archive",
    title: "Archive",
    rtlTitle: "archive",
    icon: "archive",
    // icon: "icon-cloud-download-93",
    class: ""
  },
  {
    path: "/manager",
    title: "Manage",
    rtlTitle: "Edit Users",
    icon: "account_circle",
    // icon: "icon-single-02",
    class: ""
  },
  {
    path: "/login",
    title: "Exit",
    rtlTitle: "Exit",
    icon: "exit_to_app",
    // icon: "icon-user-run",
    class: ""
  }
];

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"]
})
export class SidebarComponent implements OnInit {

  menuItems: any[];
  currentUrl: string;

  constructor(private authGuard: AuthGuardService, private route: Router) { }

  ngOnInit() {
    this.currentUrl = this.route.url;

    this.menuItems = ROUTES.filter(menuItem => menuItem);
    if (this.authGuard.userRole !== Role.ADMIN) {
      this.menuItems.splice(2, 1);
    }
    if (this.authGuard.userRole === Role.Debrifer) {
      this.menuItems.splice(0, 1)
    } else if (this.authGuard.userRole === Role.Pilot) {
      this.menuItems.splice(1, 1)
    }
  }

  isMobileMenu() {
    if (window.innerWidth > 991) {
      return false;
    }
    return true;
  }
}
