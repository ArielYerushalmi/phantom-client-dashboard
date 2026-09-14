import { Routes } from "@angular/router";

import { HomeComponent } from "../../pages/home/home.component";
import { LiveDashboardComponent } from "../../pages/live/live-dashboard/live-dashboard.component";
import { PresetManagerComponent } from "../../pages/live/preset-manager/preset-manager.component";
import { ArchiveComponent } from '../../pages/archive/archive-manager/archive.component';
import { AuthGuardService } from "src/app/common/services/authGuard-service/auth-guard.service";
import { AdminManagmentComponent } from "src/app/pages/admin-managment/admin-managment/admin-managment.component";


export const AdminLayoutRoutes: Routes = [
  { path: "", redirectTo: "home", pathMatch: "full" },
  { path: "home", component: HomeComponent, canActivate: [AuthGuardService], },
  { path: "live", component: LiveDashboardComponent, canActivate: [AuthGuardService], },
  { path: "presetmanager", component: PresetManagerComponent, canActivate: [AuthGuardService], },
  { path: "archive", component: ArchiveComponent, canActivate: [AuthGuardService], },
  { path: "manager", component: AdminManagmentComponent, canActivate: [AuthGuardService], },
];
