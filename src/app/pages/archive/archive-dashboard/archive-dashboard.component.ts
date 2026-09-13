import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { GridsterConfig } from 'angular-gridster2';
import { createDashboardDTO } from 'src/app/common/dtos/dashboard/create-dashboard.dto';
import { DashboardRO } from 'src/app/common/dtos/dashboard/dashboard.ro';
import { updateDashboardDTO } from 'src/app/common/dtos/dashboard/update-dashboard.dto';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
import { ChartType } from 'src/app/common/enums/chartType.enum';
import { IArchiveSettings } from 'src/app/common/interfaces/archive/telemetry-archive-settings';
import { IChartGridsterItem } from 'src/app/common/interfaces/gridster/chart-gridster-item.interface';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { ArchiveService } from 'src/app/common/services/archive-service/archive.service';
import { DashboardService } from 'src/app/common/services/dashboard-service/dashboard.service';
import { PresetsUtilsService } from 'src/app/common/services/presets-utils-service/presets-utils.service';

@Component({
  selector: 'app-archive-dashboard',
  templateUrl: './archive-dashboard.component.html',
  styleUrls: ['./archive-dashboard.component.scss']
})
export class ArchiveDashboardComponent implements OnInit {
  @Output() backToFiltering: boolean;
  @Input() lengthForPaginator: number;
  @Input() startTime: Date;
  @Input() endTime: Date;

  pageSize: number = 5;
  pageIndex: number = 0;
  pageSizeOptions = [5, 10, 15];
  pageEvent: PageEvent;
  skipFrames: number = 0;
  chartTypes = [ChartType.TABLE, ChartType.GRAPH];

  options: GridsterConfig;
  parameters: ParameterRO[] = [];
  gridsterItemsList: IChartGridsterItem[] = [];
  dashboardItemMap = new Map<string, EventEmitter<number[]>>();
  menuArray: boolean[] = new Array(this.gridsterItemsList.length).fill(false)
  dashboard: DashboardRO = null;
  dashboards: DashboardRO[] = [];
  IsLive: boolean = false;
  isUpdatePopup: boolean = false;



  @Output() goToFilterPage: EventEmitter<void> = new EventEmitter<void>();
  @ViewChild('paginator') paginator: MatPaginator;

  constructor(private readonly dashboardservice: DashboardService, private readonly presetsUtils: PresetsUtilsService, private readonly archiveService: ArchiveService) { }

  ngOnInit(): void {
    this.dashboardservice.getParameters().then((parameters: ParameterRO[]) => {
      this.parameters = parameters;
    }).catch((error: HttpErrorResponse) => {
      if (error.error.message != undefined) {
        console.log(error.error.message);
      } else {
        console.log("dashboard service is down!");
      }
    });

    this.archiveService._getLengthSubscription.subscribe((message: number) => {
      if (message) {
        console.log("got length from archive server: ", message);
        this.lengthForPaginator = message
      }
    });

    this.archiveService._subscription.subscribe((message: IArchiveSettings) => {
      if (message)
        this.handleMessage(message);
    });

    this.options = {
      gridType: 'fit',
      pushItems: true,
      maxCols: 5,
      maxRows: 4,
      resizable: {
        enabled: true,
      },
      draggable: {
        enabled: true,
      }
    };
  }

  updateDashboard() {
    let updatedDashboard: updateDashboardDTO = this.presetsUtils.updateDashboardItems(this.dashboard, this.gridsterItemsList);
    this.dashboardservice.updateDashboard(this.dashboard.id, updatedDashboard).subscribe((newDashboard: DashboardRO) => {
      this.dashboard = newDashboard;
      this.isUpdatePopup = true;
    },
      (error: HttpErrorResponse) => {
        if (error.error.message != undefined) {
          console.log(error.error.message);
        } else {
          console.log("dashboard service is down!");
        }
      });
  };

  updatePopupToggle() {
    this.isUpdatePopup = !this.isUpdatePopup;
  }

  createPreset(presetName: string) {
    let preset: createDashboardDTO = this.presetsUtils.setDashboard(presetName, this.IsLive);
    this.dashboardservice.createDashboard(preset).subscribe((dashboard: DashboardRO) => {
      this.dashboardservice.getDashboard(dashboard.id).subscribe((createdDashboard: DashboardRO) => {
        this.onGetPreset(createdDashboard);
        this.dashboards.push(createdDashboard);
      });
    }, (error: HttpErrorResponse) => {
      if (error.error.message != undefined) {
        console.log(error.error.message);
      } else {
        console.log("dashboard service is down!");
      }
    });
  };

  onGetPreset(eventData: DashboardRO) {
    this.dashboard = eventData;
    this.loadPresetByIndex();
  };

  loadPresetByIndex(): void {
    for (const dashboardItemRO of this.dashboard.items) {
      this.onAdd(dashboardItemRO.parameter, dashboardItemRO.chartType,
        { cols: dashboardItemRO.cols, rows: dashboardItemRO.rows, x: dashboardItemRO.x, y: dashboardItemRO.y });
    };
    if (this.lengthForPaginator > 0)
      this.onSubscribeAll();
  };

  onGotoPresetManager() {
    this.dashboard = null;
    this.gridsterItemsList = [];
  };

  onGotoFilterPage() {
    this.goToFilterPage.emit();
  }

  handlePageEvent(e: PageEvent) {
    this.skipFrames = (e.pageIndex * this.pageSize);
    this.onSubscribeAll(e);
    this.setPage(e)
  }

  setPage(e: PageEvent) {
    this.pageEvent = e;
    this.lengthForPaginator = e.length;
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
  }

  onSubscribeAll(e?: PageEvent) {
    if (e != undefined) {
      for (let i = 0; i < this.gridsterItemsList.length; i++) {
        this.archiveService.httpSubscribe(this.gridsterItemsList[i].chart.parameter.parameterName, e.pageSize, this.skipFrames, this.startTime, this.endTime)
      }
    } else {
      for (let i = 0; i < this.gridsterItemsList.length; i++) {
        this.archiveService.httpSubscribe(this.gridsterItemsList[i].chart.parameter.parameterName, this.pageSize, this.skipFrames, this.startTime, this.endTime)
      }
    }
  }

  handleMessage(gridsterItemData: IArchiveSettings) {
    var dataEvent = this.dashboardItemMap.get(gridsterItemData.parameter);
    var arrayToEmit: number[] = [];
    gridsterItemData.values.forEach(item => {
      let index: number = this.presetsUtils.findItemByName(this.gridsterItemsList, gridsterItemData.parameter);
      if (index != -1) {
        let chartType: ChartType = this.gridsterItemsList[index].chart.chartType;
        let dataToEmit: any = this.presetsUtils.structureDataToType(item.value, chartType, item.time);
        arrayToEmit.push(dataToEmit);
      };
    });
    dataEvent.emit(arrayToEmit);
  };

  onSubscribeParameter(parameterName: string) {
    this.archiveService.httpSubscribe(parameterName, this.pageSize, this.pageIndex, this.startTime, this.endTime)
  }

  isParameterUsed(parameter: ParameterRO): boolean {
    return this.presetsUtils.isParameterExists(parameter, this.gridsterItemsList);
  };

  onAdd(parameter: ParameterRO, chartType: ChartType,
    { cols = 1, rows = 1, x = 0, y = 0 }: { cols?: number, rows?: number, x?: number, y?: number }): Promise<void> {
    if (this.gridsterItemsList.length >= this.options.maxCols * this.options.maxRows)
      return;

    let itemToAdd: IChartEntity = this.presetsUtils.initGridsterItem(parameter, chartType);

    if (!this.presetsUtils.isParameterExists(parameter, this.gridsterItemsList)) {
      this.gridsterItemsList.push({ cols, rows, x, y, chart: itemToAdd });
      this.dashboardItemMap.set(itemToAdd.parameter.parameterName, itemToAdd.dataEvent);
    };
  };

  onParameterSelected(parameter: ParameterRO) {
    let index = this.presetsUtils.findItem(this.gridsterItemsList, parameter);
    if (index != -1) {
      this.onRemove(parameter);
    } else {
      if (this.startTime != undefined || this.endTime != undefined || length > 0) {
        this.onAdd(parameter, ChartType.TABLE, {});
        this.onSubscribeParameter(parameter.parameterName);
      } else {
        console.log("Set Correct First");
      }
    }
  };

  getType(chartType: ChartType): string {
    return ChartType[chartType];
  };

  menuToggle(index: number) {
    if (index != -1) {
      this.menuArray[index] = !this.menuArray[index];
    };
  };

  onRemove(parameter: ParameterRO): void {
    let index = this.presetsUtils.findItem(this.gridsterItemsList, parameter);
    if (index != -1) {
      this.gridsterItemsList.splice(index, 1);
    };
  };

  onChangeChartType(index: number, chartType: ChartType): void {
    if (index != -1) {
      this.gridsterItemsList[index].chart.chartType = chartType;
      this.onSubscribeAll(undefined);
    };
  };
}
