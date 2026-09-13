import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DashboardRO } from 'src/app/common/dtos/dashboard/dashboard.ro';
import { ArchiveService } from 'src/app/common/services/archive-service/archive.service';
import { DashboardService } from 'src/app/common/services/dashboard-service/dashboard.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-archive-filter',
  templateUrl: './archive-filter.component.html',
  styleUrls: ['./archive-filter.component.scss']
})
export class ArchiveFilterComponent implements OnInit, OnDestroy {

  @Output() submitMetadataEvent = new EventEmitter<any>();

  IsLive: boolean = false;
  dashboards: DashboardRO[] = [];
  public toggledDashboards: boolean[] = [];

  inputStartTime: Date;
  inputEndTime: Date;
  isTimeValid: boolean = true;
  dashboardsLoadError: boolean = false;

  private getLengthSubscription: Subscription;

  constructor(private readonly dashboardservice: DashboardService, private readonly archiveService: ArchiveService) { }

  ngOnInit(): void {
    this.onGetAllDashboards();

    this.getLengthSubscription = this.archiveService._getLengthSubscription.subscribe((length: number) => {
      if (length) {
        console.log("got length from archive server: ", length);
        let message = { length, startTime: this.inputStartTime, endTime: this.inputEndTime }
        this.submitMetadataEvent.emit(message);
      }
    });
  }

  ngOnDestroy(): void {
    this.getLengthSubscription?.unsubscribe();
  }

  onGetAllDashboards() {
    this.dashboardsLoadError = false;
    this.dashboardservice.getAllDashboards(this.IsLive).subscribe((dashboards: DashboardRO[]) => {
      this.dashboards = dashboards;
      console.log(this.dashboards);
    }, (error: HttpErrorResponse) => {
      if (error.error?.message != undefined) {
        console.log(error.error.message);
      } else {
        console.log("dashboard service is down!");
      }
      this.dashboardsLoadError = true;
    });
  }

  onGetLength() {
    // console.log("start time: ", new Date(this.inputStartTime));
    // console.log("end time: ", this.inputEndTime);

    // if (this.inputStartTime != null && this.inputEndTime != null) {
    var CurrentDate: Date = new Date()
    if (CurrentDate > new Date(this.inputStartTime) && CurrentDate > new Date(this.inputEndTime)) {
      this.archiveService.httpGetLength(this.inputStartTime, this.inputEndTime);
    } else {
      this.isTimeValid = false;
      console.log("Enter Correct Time");
    }
  }

  toggle(index) {
    // toggle based on index
    this.toggledDashboards[index] = !this.toggledDashboards[index];
  }
}
