import { HttpErrorResponse } from '@angular/common/http';
import { EventEmitter, Input, Output } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { DashboardRO } from 'src/app/common/dtos/dashboard/dashboard.ro';
import { updateDashboardDTO } from 'src/app/common/dtos/dashboard/update-dashboard.dto';
import { ArchiveService } from 'src/app/common/services/archive-service/archive.service';
import { DashboardService } from 'src/app/common/services/dashboard-service/dashboard.service';

@Component({
  selector: 'app-preset-manager',
  templateUrl: './preset-manager.component.html',
  styleUrls: ['./preset-manager.component.scss']
})
export class PresetManagerComponent implements OnInit {
  @Input() IsLive: boolean;
  @Output() createPresetEvent = new EventEmitter<string>();
  @Output() presetEvent = new EventEmitter<DashboardRO>();
  @Output() goToFilterPage: EventEmitter<void> = new EventEmitter<void>();

  public toggledDashboards: boolean[] = [];
  private readonly MAX_PRESETNAME_LEN = 16;

  dashboards: DashboardRO[] = [];
  dashboard: DashboardRO;
  presetName: string = "";
  presetDescription: string = "";
  presetPopUp: boolean = false;
  deletePopUp: boolean = false;
  isPresetType: boolean = true;
  isCreatePresetValid: boolean = true;

  description = new FormControl('', Validators.required);


  constructor(private readonly dashboardservice: DashboardService) { }

  ngOnInit(): void {
    console.log("dashboards: ", this.dashboards)
    this.onGetAllDashboards();
  }

  goToPreset(dashboard: DashboardRO) {
    this.presetEvent.emit(dashboard);
  }

  onGetPreset(dashboardToFind: DashboardRO) {
    this.dashboard = this.dashboards.find(item =>
      item.id === dashboardToFind.id);
  }

  getPresetDescription(dashboardToFind: DashboardRO) {
    this.onGetPreset(dashboardToFind);
    this.presetDescription = this.dashboard.description;
  }

  updateDescription() {
    let updateDashboard = new updateDashboardDTO(undefined, undefined, this.presetDescription);
    this.dashboardservice.updateDashboard(this.dashboard.id, updateDashboard).subscribe((newDashboard: DashboardRO) => {
      this.dashboard = newDashboard;
    });
    this.dashboard.description = this.presetDescription;
  };

  deletePreset() {
    this.dashboardservice.deleteDashboard(this.dashboard.id).subscribe((deletedDashboard: DashboardRO) => {
      console.log(deletedDashboard);
      this.onGetAllDashboards();
    });;
  }

  onGetAllDashboards() {
    this.dashboardservice.getAllDashboards(this.IsLive).subscribe((dashboards: DashboardRO[]) => {
      this.dashboards = dashboards;
      console.log(this.dashboards);
    }, (error: HttpErrorResponse) => {
      if (error.error.message != undefined) {
        console.log(error.error.message);
      } else {
        console.log("dashboard service is down!");
      }
    });
  }

  createPreset() {
    if (this.presetName != "" && this.presetNameValidation(this.presetName)) {
      this.isCreatePresetValid = true;
      this.createPresetEvent.emit(this.presetName);
    } else {
      this.isCreatePresetValid = false;
    }
  }

  presetNameValidation(presetName: string): boolean {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let text = ctx.measureText(presetName);
    let width = Math.ceil(text.width);
    return width < 85;
  }

  onPresetPopUpClick() {
    this.presetPopUp = !this.presetPopUp;
  }

  onPresetTypeChange() {
    this.isPresetType = !this.isPresetType;
  }

  ondeletePopUpClick(dashboardToDelete: DashboardRO) {
    this.deletePopUp = !this.deletePopUp;
    if (this.deletePopUp) {
      this.onGetPreset(dashboardToDelete);
    }
  }

  toggle(index) {
    // toggle based on index
    this.toggledDashboards[index] = !this.toggledDashboards[index];
  }

  onGotoFilterPage() {
    this.goToFilterPage.emit();
  }

}
