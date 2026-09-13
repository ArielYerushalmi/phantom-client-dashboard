import { CommonModule } from "@angular/common";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { NgModule, OnInit } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TablesComponent } from "../../pages/tables/tables.component";
import { TypographyComponent } from "../../pages/typography/typography.component";
import { UserComponent } from "../../pages/user/user.component";
import { AdminLayoutRoutes } from "./admin-layout.routing";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { NgxGaugeModule } from "ngx-gauge";
import { NgxChartsModule } from "@swimlane/ngx-charts";

import { LiveGaugeComponent } from "../../pages/live/charts/gauge/live-gauge.component";
import { ChartsTryComponent } from "../../pages/live/charts/graph/live-graph.component";
import { GridsterModule } from "angular-gridster2";
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LiveDashboardComponent } from "../../pages/live/live-dashboard/live-dashboard.component";
import { LiveChartComponent } from "../../pages/live/live-chart/live-chart.component";
import { LiveLabelComponent } from '../../pages/live/charts/label/live-label.component';
import { LiveStatusComponent } from "../../pages/live/charts/status/live-status.component";
import { LiveAlertComponent } from '../../pages/live/charts/alert/live-alert.component';
import { LivePieComponent } from '../../pages/live/charts/pie/live-pie.component';
import { PresetManagerComponent } from '../../pages/live/preset-manager/preset-manager.component';
import { ArchiveComponent } from '../../pages/archive/archive-manager/archive.component';
import { MatNativeDateModule } from "@angular/material/core";
import { ArchiveChartComponent } from '../../pages/archive/archive-chart/archive-chart.component';
import { TableComponent } from '../../pages/archive/charts/table/table.component';
import { GraphComponent } from '../../pages/archive/charts/graph/graph.component';
import { ArchiveFilterComponent } from '../../pages/archive/archive-filter/archive-filter.component';
import { ArchiveDashboardComponent } from '../../pages/archive/archive-dashboard/archive-dashboard.component';
import { SidebarComponent } from "src/app/components/sidebar/sidebar.component";
import { IUser } from "src/app/common/interfaces/user/user.intefrace";
import { LayoutModule } from "../layout.module";
import { AuthGuardService } from "src/app/common/services/authGuard-service/auth-guard.service";
import { AdminManagmentComponent } from '../../pages/admin-managment/admin-managment/admin-managment.component';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon"

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(AdminLayoutRoutes),
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgbModule,
    NgxGaugeModule,
    NgxChartsModule,
    GridsterModule,
    MatSidenavModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  declarations: [
    ChartsTryComponent,
    LiveGaugeComponent,
    UserComponent,
    TablesComponent,
    TypographyComponent,
    LiveDashboardComponent,
    LiveChartComponent,
    LiveLabelComponent,
    LiveStatusComponent,
    LiveAlertComponent,
    LivePieComponent,
    PresetManagerComponent,
    ArchiveComponent,
    ArchiveChartComponent,
    TableComponent,
    GraphComponent,
    ArchiveFilterComponent,
    ArchiveDashboardComponent,
    SidebarComponent,
    AdminManagmentComponent
  ],
  providers: [AuthGuardService]
})
export class AdminLayoutModule {
}