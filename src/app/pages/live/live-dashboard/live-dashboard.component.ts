import { Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { GridsterConfig } from 'angular-gridster2';
import { DashboardService } from 'src/app/common/services/dashboard-service/dashboard.service';
import { IChartGridsterItem } from '../../../common/interfaces/gridster/chart-gridster-item.interface';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
import { DashboardRO } from 'src/app/common/dtos/dashboard/dashboard.ro';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { ChartType } from 'src/app/common/enums/chartType.enum';
import { PresetsUtilsService } from '../../../common/services/presets-utils-service/presets-utils.service'
import { LtsService } from '../../../common/services/lts-service/lts.service'
import { FrameParameter } from '../../../common/dtos/live/frame-parameter';
import { createDashboardDTO } from 'src/app/common/dtos/dashboard/create-dashboard.dto';
import { Router } from '@angular/router';
import { IUser } from 'src/app/common/interfaces/user/user.intefrace';
import { updateDashboardDTO } from 'src/app/common/dtos/dashboard/update-dashboard.dto';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-live-dashboard',
  templateUrl: './live-dashboard.component.html',
  styleUrls: ['./live-dashboard.component.scss']
})
export class LiveDashboardComponent implements OnInit, OnDestroy {

  IsLive: boolean = true;
  options: GridsterConfig;
  gridsterItemsList: IChartGridsterItem[] = [];
  dashboardItemMap = new Map<string, EventEmitter<number>>();
  dashboards: DashboardRO[] = [];
  parameters: ParameterRO[] = [];
  chartTypes = [ChartType.GAUGE, ChartType.GRAPH, ChartType.PIE, ChartType.LABEL, ChartType.ALERT, ChartType.STATUS];
  isMenu: boolean = false;
  isRefresh: boolean = true;
  menuArray: boolean[] = new Array(this.gridsterItemsList.length).fill(false)
  dashboard: DashboardRO = null;
  isUpdatePopup: boolean = false;

  user: any;

  constructor(private readonly dashboardservice: DashboardService, private readonly presetsUtils: PresetsUtilsService, private readonly liveDataWebSocket: LtsService) { }

  async ngOnInit() {
    this.dashboardservice.getParameters().then((parameters: ParameterRO[]) => {
      this.parameters = parameters;
    }).catch((error: any) => {
      console.error('Error occurred while fetching parameters:', error);
    });

    this.liveDataWebSocket.start()
    this.liveDataWebSocket._subscription.subscribe((message: MessageEvent) => {
      let liveData: FrameParameter[] = JSON.parse(message.data);
      this.handleLiveMessage(liveData);
    });

    this.options = {
      gridType: 'fit',
      pushItems: true,
      maxCols: 5,
      maxRows: 5,
      resizable: {
        enabled: true,
      },
      draggable: {
        enabled: true,
      }
    };
  };

  async onParameterSelected(parameter: ParameterRO) {
    let index = this.presetsUtils.findItem(this.gridsterItemsList, parameter);
    if (index != -1) {
      this.onRemove(parameter);
    } else {
      this.onAdd(parameter, parameter.chartTypes[0], {});
      await this.syncSubscription();
    }
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

  async onRemove(parameter: ParameterRO): Promise<void> {
    let index = this.presetsUtils.findItem(this.gridsterItemsList, parameter);
    if (index != -1) {
      this.gridsterItemsList.splice(index, 1);
    };
    await this.syncSubscription();
  };

  onChangeChartType(index: number, chartType: ChartType): void {
    if (index != -1) {
      this.gridsterItemsList[index].chart.chartType = chartType;
    };
  };

  async loadPresetByIndex(): Promise<void> {
    for (const dashboardItemRO of this.dashboard.items) {
      this.onAdd(dashboardItemRO.parameter, dashboardItemRO.chartType,
        { cols: dashboardItemRO.cols, rows: dashboardItemRO.rows, x: dashboardItemRO.x, y: dashboardItemRO.y });
    };

    await this.syncSubscription();
  };

  handleLiveMessage(gridsterItemData: FrameParameter[]) {
    gridsterItemData.forEach(item => {
      var dataEvent = this.dashboardItemMap.get(item.Name);
      let index: number = this.presetsUtils.findItemByName(this.gridsterItemsList, item.Name);
      if (index != -1) {
        let chartType: ChartType = this.gridsterItemsList[index].chart.chartType;
        let dataToEmit: any = this.presetsUtils.structureDataToType(item.Data, chartType);
        dataEvent.emit(dataToEmit);
      };
    });
  };

  getType(chartType: ChartType): string {
    return ChartType[chartType];
  };

  menuToggle(index: number) {
    if (index != -1) {
      this.menuArray[index] = !this.menuArray[index];
    };
  };

  refreshToggle() {
    this.isRefresh = !this.isRefresh;
  };

  isParameterUsed(parameter: ParameterRO): boolean {
    return this.presetsUtils.isParameterExists(parameter, this.gridsterItemsList);
  };

  async syncSubscription() {
    let strArrayToSubscribe: string[] = this.gridsterItemsList.map((gridsterItem) => {
      return gridsterItem.chart.parameter.parameterName;
    });
    await this.liveDataWebSocket.subscribe(strArrayToSubscribe);
  };

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

  updateDashboard() {
    let updatedDashboard: updateDashboardDTO = this.presetsUtils.updateDashboardItems(this.dashboard, this.gridsterItemsList);
    this.dashboardservice.updateDashboard(this.dashboard.id, updatedDashboard).subscribe((newDashboard: DashboardRO) => {
      this.dashboard = newDashboard;
      this.isUpdatePopup = true;
    });
  };

  updatePopupToggle() {
    this.isUpdatePopup = !this.isUpdatePopup;
  }

  async onGetPreset(eventData: DashboardRO) {
    this.dashboard = eventData;
    await this.loadPresetByIndex();
  };

  onGotoPresetManager() {
    this.dashboard = null;
    this.gridsterItemsList = [];
    console.log("gridsterList: ", this.gridsterItemsList);
    this.liveDataWebSocket.clearSubscription();
  };

  ngOnDestroy(): void {
    this.liveDataWebSocket.unsubscribe();
  }
};
