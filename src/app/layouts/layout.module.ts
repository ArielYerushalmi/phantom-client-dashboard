import { NgModule, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BrowserModule } from "@angular/platform-browser";
import { Routes, RouterModule, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate, UrlTree, Router } from "@angular/router";

import { AdminLayoutComponent } from "./admin-layout/admin-layout.component";

import { FormsModule } from "@angular/forms";
import { ComponentsModule } from "../components/components.module";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { IUser } from "../common/interfaces/user/user.intefrace";
import { Role } from "../common/enums/role.enum";
import { AuthGuardService } from "../common/services/authGuard-service/auth-guard.service";


const routes: Routes = [
  {
    path: "login",
    redirectTo: "login",
    pathMatch: "full"
  },
  {
    path: "",
    component: AdminLayoutComponent,
    children: [
      {
        path: "",
        loadChildren: () => import("./admin-layout/admin-layout.module").then(m => m.AdminLayoutModule)
      }
    ]
  },
  {
    path: "**",
    redirectTo: "login"
  },
  {
    path: "",
    redirectTo: "login"
  },
];

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    RouterModule.forRoot(routes, {
      useHash: true
    }),

    ComponentsModule,
    FormsModule

  ],
  exports: [RouterModule],
})
export class LayoutModule { }
