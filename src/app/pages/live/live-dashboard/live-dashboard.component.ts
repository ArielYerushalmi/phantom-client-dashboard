import { Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
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
import { IUser } from 'src/app/common/interfaces/user/user.intefrace';
import { updateDashboardDTO } from 'src/app/common/dtos/dashboard/update-dashboard.dto';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-live-dashboard',
  templateUrl: './live-dashboard.component.html',
  styleUrls: ['./live-dashboard.component.scss']
})
export class LiveDashboardComponent implements OnInit, OnDestroy {

  IsLive: boolean = true;

  /**
   * Every currently-subscribed parameter, in the order it was added. Kept as
   * IChartGridsterItem[] (rather than a plain IChartEntity[]) purely so the existing
   * preset-persistence DTOs (CreateDashboardItemDTO / updateDashboardDTO), which are
   * built straight from this shape, keep working untouched. The cols/rows/x/y fields
   * are no longer meaningful for layout - there's no grid to place items on anymore -
   * and are only ever written as 1/1/0/0 for newly-added parameters.
   */
  watchedItems: IChartGridsterItem[] = [];
  dashboardItemMap = new Map<string, EventEmitter<number>>();

  /** parameterName of the item currently shown in the large focus panel, or null when nothing is watched. */
  focusedParameterName: string | null = null;

  dashboards: DashboardRO[] = [];
  parameters: ParameterRO[] = [];
  isRefresh: boolean = true;
  dashboard: DashboardRO = null;
  isUpdatePopup: boolean = false;

  user: any;

  /** Surfaced in the template so a downed parameters service isn't just a silent, empty drawer. */
  parametersLoadError: boolean = false;
  /** True while the live websocket is disconnected (initial connect, drop, or reconnect attempt). */
  wsDisconnected: boolean = false;

  private liveMessageSubscription: Subscription;
  private connectionStateSubscription: Subscription;

  constructor(private readonly dashboardservice: DashboardService, private readonly presetsUtils: PresetsUtilsService, private readonly liveDataWebSocket: LtsService, private readonly toastr: ToastrService) { }

  async ngOnInit() {
    this.loadParameters();

    this.liveDataWebSocket.start()
    this.liveMessageSubscription = this.liveDataWebSocket._subscription.subscribe((message: MessageEvent) => {
      let liveData: FrameParameter[] = JSON.parse(message.data);
      this.handleLiveMessage(liveData);
    });
    this.connectionStateSubscription = this.liveDataWebSocket.connectionState.subscribe((isOpen: boolean) => {
      this.wsDisconnected = !isOpen;
    });
  };

  /** The single parameter shown large in the focus panel, or null when nothing is watched. */
  get focusedItem(): IChartGridsterItem | null {
    if (!this.focusedParameterName) {
      return null;
    }
    return this.watchedItems.find((item) => item.chart.parameter.parameterName === this.focusedParameterName) ?? null;
  }

  /** Every watched parameter other than the focused one - rendered as the compact strip. */
  get stripItems(): IChartGridsterItem[] {
    return this.watchedItems.filter((item) => item.chart.parameter.parameterName !== this.focusedParameterName);
  }

  async onParameterSelected(parameter: ParameterRO) {
    let index = this.presetsUtils.findItem(this.watchedItems, parameter);
    if (index != -1) {
      this.onRemove(parameter);
    } else {
      this.onAdd(parameter);
      await this.syncSubscription();
    }
  };

  onAdd(parameter: ParameterRO,
    { cols = 1, rows = 1, x = 0, y = 0 }: { cols?: number, rows?: number, x?: number, y?: number } = {}): void {
    // Every parameter watched on this page is driven off the same LiveData (value + time)
    // shape - regardless of whatever chart type an older saved preset had recorded for it -
    // so the focus/strip readouts always have both a number and a timeseries to draw from.
    let itemToAdd: IChartEntity = this.presetsUtils.initGridsterItem(parameter, ChartType.GRAPH);

    if (!this.presetsUtils.isParameterExists(parameter, this.watchedItems)) {
      this.watchedItems.push({ cols, rows, x, y, chart: itemToAdd });
      this.dashboardItemMap.set(itemToAdd.parameter.parameterName, itemToAdd.dataEvent);
      if (!this.focusedParameterName) {
        this.focusedParameterName = parameter.parameterName;
      }
    };
  };

  async onRemove(parameter: ParameterRO): Promise<void> {
    let index = this.presetsUtils.findItem(this.watchedItems, parameter);
    if (index != -1) {
      this.watchedItems.splice(index, 1);
    };
    // Without this, the map keeps a growing set of stale EventEmitters for parameters
    // that are no longer on the dashboard, and handleLiveMessage keeps emitting into them.
    this.dashboardItemMap.delete(parameter.parameterName);

    if (this.focusedParameterName === parameter.parameterName) {
      // Promote whatever's left at the front of the strip; null (empty state) if nothing remains.
      this.focusedParameterName = this.watchedItems[0]?.chart.parameter.parameterName ?? null;
    }

    await this.syncSubscription();
  };

  /** Swaps a compact strip item into the large focus slot. */
  promoteToFocus(parameterName: string): void {
    this.focusedParameterName = parameterName;
  };

  async loadPresetByIndex(): Promise<void> {
    for (const dashboardItemRO of this.dashboard.items) {
      this.onAdd(dashboardItemRO.parameter,
        { cols: dashboardItemRO.cols, rows: dashboardItemRO.rows, x: dashboardItemRO.x, y: dashboardItemRO.y });
    };

    await this.syncSubscription();
  };

  handleLiveMessage(gridsterItemData: FrameParameter[]) {
    gridsterItemData.forEach(item => {
      var dataEvent = this.dashboardItemMap.get(item.Name);
      let index: number = this.presetsUtils.findItemByName(this.watchedItems, item.Name);
      if (index != -1) {
        let chartType: ChartType = this.watchedItems[index].chart.chartType;
        let dataToEmit: any = this.presetsUtils.structureDataToType(item.Data, chartType);
        dataEvent.emit(dataToEmit);
      };
    });
  };

  refreshToggle() {
    this.isRefresh = !this.isRefresh;
  };

  isParameterUsed(parameter: ParameterRO): boolean {
    return this.presetsUtils.isParameterExists(parameter, this.watchedItems);
  };

  async syncSubscription() {
    let strArrayToSubscribe: string[] = this.watchedItems.map((watchedItem) => {
      return watchedItem.chart.parameter.parameterName;
    });
    await this.liveDataWebSocket.subscribe(strArrayToSubscribe);
  };

  loadParameters() {
    this.parametersLoadError = false;
    this.dashboardservice.getParameters().then((parameters: ParameterRO[]) => {
      this.parameters = parameters;
    }).catch((error: any) => {
      console.error('Error occurred while fetching parameters:', error);
      this.parametersLoadError = true;
    });
  };

  createPreset(presetName: string) {
    let preset: createDashboardDTO = this.presetsUtils.setDashboard(presetName, this.IsLive);
    this.dashboardservice.createDashboard(preset).subscribe((dashboard: DashboardRO) => {
      this.dashboardservice.getDashboard(dashboard.id).subscribe((createdDashboard: DashboardRO) => {
        this.onGetPreset(createdDashboard);
        this.dashboards.push(createdDashboard);
      });
    }, (error: HttpErrorResponse) => {
      if (error.error?.message != undefined) {
        console.log(error.error.message);
      } else {
        console.log("dashboard service is down!");
      }
    });
  };

  updateDashboard() {
    let updatedDashboard: updateDashboardDTO = this.presetsUtils.updateDashboardItems(this.dashboard, this.watchedItems);
    this.dashboardservice.updateDashboard(this.dashboard.id, updatedDashboard).subscribe((newDashboard: DashboardRO) => {
      this.dashboard = newDashboard;
      this.isUpdatePopup = true;
    }, (error: HttpErrorResponse) => {
      if (error.error?.message != undefined) {
        console.log(error.error.message);
      } else {
        console.log("dashboard service is down!");
      }
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
    this.watchedItems = [];
    this.focusedParameterName = null;
    this.dashboardItemMap.clear();
    this.liveDataWebSocket.clearSubscription();
  };

  ngOnDestroy(): void {
    this.liveMessageSubscription?.unsubscribe();
    this.connectionStateSubscription?.unsubscribe();
    this.liveDataWebSocket.unsubscribe();
  }
};
