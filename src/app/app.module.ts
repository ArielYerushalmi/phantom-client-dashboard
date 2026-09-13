import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ToastrModule } from 'ngx-toastr';

import { AppComponent } from "./app.component";
import { AdminLayoutComponent } from "./layouts/admin-layout/admin-layout.component";
import { AuthLayoutComponent } from "./layouts/auth-layout/auth-layout.component";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

// import { FeatherModule } from 'angular-feather';
// import { 
//   MinusCircle, Edit, Plus, PlusSquare, Github, Zap, Check, LogIn, ArrowLeft, 
//   CheckSquare, Grid, FilePlus, Delete, Menu, CornerDownLeft, Eye 
// } from 'angular-feather/icons';
import { NgxGaugeModule } from "ngx-gauge";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { AppRoutingModule } from "./app-routing.module";
import { ComponentsModule } from "./components/components.module";
import { LoginComponent } from "./login/login/login.component";
import { RegisterComponent } from "./login/register/register.component";
import { MatSelectModule } from "@angular/material/select";
import { MatInputModule } from "@angular/material/input";
import { MatSidenavModule } from "@angular/material/sidenav";
import {MatFormFieldModule} from '@angular/material/form-field';
 

// const icons = {
//   MinusCircle,
//   Edit,
//   Plus,
//   PlusSquare,
//   Github,
//   Zap,
//   Check,
//   LogIn,
//   ArrowLeft,
//   CheckSquare,
//   Grid,
//   FilePlus,
//   Delete,
//   Menu,
//   CornerDownLeft,
//   Eye
// };

@NgModule({
  imports: [
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    ComponentsModule,
    NgbModule,
    MatSidenavModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    NgxGaugeModule,
    NgxChartsModule,
    AppRoutingModule,
    ToastrModule.forRoot(),
    // FeatherModule.pick(icons)
  ],
  declarations: [AppComponent, AdminLayoutComponent, AuthLayoutComponent, LoginComponent, RegisterComponent],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
