import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
// import { AngularFeatherModule } from 'angular-feather';

import { FooterComponent } from "./footer/footer.component";
import { NavbarComponent } from "./navbar/navbar.component";
import { SidebarComponent } from "./sidebar/sidebar.component";
// import { IconArrowLeft, IconCheck, IconCheckSquare, IconCornerDownLeft, IconDelete, IconEdit, IconEye, IconFilePlus, IconGithub, IconGrid, IconLogIn, IconMenu, IconMinusCircle, IconPlus, IconPlusSquare, IconZap, } from 'angular-feather';
// import { IconFeather } from "angular-feather";

// const icons = [
//   IconArrowLeft,
//   IconCheck,
//   IconCheckSquare,
//   IconCornerDownLeft,
//   IconDelete,
//   IconEdit,
//   IconEye,
//   IconFilePlus,
//   IconGithub,
//   IconGrid,
//   IconLogIn,
//   IconMenu,
//   IconMinusCircle,
//   IconPlus,
//   IconPlusSquare,
//   IconZap
// ];

@NgModule({
  imports: [CommonModule, RouterModule, NgbModule],
  declarations: [FooterComponent, NavbarComponent],
  exports: [FooterComponent, NavbarComponent]
})

// AngularFeatherModule.forRoot({ icons })
export class ComponentsModule { }