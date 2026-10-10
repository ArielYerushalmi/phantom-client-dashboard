import { Component, OnDestroy, OnInit } from '@angular/core';
import { DashboardService } from 'src/app/common/services/dashboard-service/dashboard.service';
import { IChartGridsterItem } from '../../../common/interfaces/gridster/chart-gridster-item.interface';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
import { DashboardRO } from 'src/app/common/dtos/dashboard/dashboard.ro';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { ChartType } from 'src/app/common/enums/chartType.enum';
import { PresetsUtilsService } from '../../../common/services/presets-utils-service/presets-utils.service'
import { LiveLinkState, LtsService } from '../../../common/services/lts-service/lts.service'
import { FrameParameter } from '../../../common/dtos/live/frame-parameter';
import { createDashboardDTO } from 'src/app/common/dtos/dashboard/create-dashboard.dto';
import { IUser } from 'src/app/common/interfaces/user/user.intefrace';
import { updateDashboardDTO } from 'src/app/common/dtos/dashboard/update-dashboard.dto';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ParamReading, TREND_POINTS } from '../charts/param-tile/param-tile.component';
import { isDiscrete, paramStatus } from '../charts/param-status';

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

  /** Latest reading per watched parameter name; the single source for every tile and the summary. */
  readings: { [parameterName: string]: ParamReading } = {};
  /** One shared clock so every tile ages its data against the same instant. */
  now: number = Date.now();
  lastFrameAt: number | null = null;

  dashboards: DashboardRO[] = [];
  parameters: ParameterRO[] = [];
  isRefresh: boolean = true;
  dashboard: DashboardRO = null;
  isSaving: boolean = false;
  parametersLoading: boolean = true;
  parameterFilter: string = '';
  link: LiveLinkState = { phase: 'idle', attempt: 0, maxAttempts: 5, retryInMs: 0 };

  user: any;

  /** Surfaced in the template so a downed parameters service isn't just a silent, empty drawer. */
  parametersLoadError: boolean = false;
  /** True while the live websocket is disconnected (initial connect, drop, or reconnect attempt). */
  wsDisconnected: boolean = false;

  private liveMessageSubscription: Subscription;
  private connectionStateSubscription: Subscription;
  private linkStateSubscription: Subscription;
  private clockTimer: any;

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
    this.linkStateSubscription = this.liveDataWebSocket.linkState.subscribe((state: LiveLinkState) => {
      this.link = state;
    });
    this.clockTimer = setInterval(() => this.now = Date.now(), 1000);
  };

  /** Parameters matching the drawer's filter box (case-insensitive, name or units). */
  get filteredParameters(): ParameterRO[] {
    const q = this.parameterFilter.trim().toLowerCase();
    if (!q) {
      return this.parameters;
    }
    return this.parameters.filter((p) =>
      p.parameterName.toLowerCase().includes(q) || (p.units ?? '').toLowerCase().includes(q));
  }

  trackByParameterId(_: number, parameter: ParameterRO) {
    return parameter.id;
  }

  trackByWatched(_: number, item: IChartGridsterItem) {
    return item.chart.parameter.parameterName;
  }

  retryLink(): void {
    this.liveDataWebSocket.retry();
  }

  /** Quantities (speed, altitude, ...) in preset order. */
  get quantityItems(): IChartGridsterItem[] {
    return this.watchedItems.filter((item) => !isDiscrete(item.chart.parameter));
  }

  /** ON/OFF states (armed, autopilot, ...) in preset order. */
  get stateItems(): IChartGridsterItem[] {
    return this.watchedItems.filter((item) => isDiscrete(item.chart.parameter));
  }

  readingFor(item: IChartGridsterItem): ParamReading {
    return this.readings[item.chart.parameter.parameterName];
  }

  /** Parameters out of range or showing a fault. */
  get alarmCount(): number {
    return this.countStatus('alarm');
  }

  /** Parameters that have stopped updating. */
  get staleCount(): number {
    return this.countStatus('stale');
  }

  private countStatus(status: string): number {
    return this.watchedItems.filter((item) => {
      const r = this.readingFor(item);
      return r && paramStatus(item.chart.parameter, r.value, r.lastUpdate, this.now) === status;
    }).length;
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
    // so every tile has both a number and a timeseries to draw from.
    let itemToAdd: IChartEntity = this.presetsUtils.initGridsterItem(parameter, ChartType.GRAPH);

    if (!this.presetsUtils.isParameterExists(parameter, this.watchedItems)) {
      this.watchedItems.push({ cols, rows, x, y, chart: itemToAdd });
      this.readings[parameter.parameterName] = { value: null, lastUpdate: null, changedAt: null, history: [] };
    };
  };

  async onRemove(parameter: ParameterRO): Promise<void> {
    let index = this.presetsUtils.findItem(this.watchedItems, parameter);
    if (index != -1) {
      this.watchedItems.splice(index, 1);
    };
    delete this.readings[parameter.parameterName];

    await this.syncSubscription();
  };

  async loadPresetByIndex(): Promise<void> {
    for (const dashboardItemRO of this.dashboard.items) {
      this.onAdd(dashboardItemRO.parameter,
        { cols: dashboardItemRO.cols, rows: dashboardItemRO.rows, x: dashboardItemRO.x, y: dashboardItemRO.y });
    };

    await this.syncSubscription();
  };

  handleLiveMessage(frame: FrameParameter[]) {
    const t = Date.now();
    frame.forEach(item => {
      const reading = this.readings[item.Name];
      if (!reading) {
        return;
      }
      if (reading.value !== item.Data) {
        reading.changedAt = t;
      }
      reading.value = item.Data;
      reading.lastUpdate = t;
      reading.history.push(item.Data);
      if (reading.history.length > TREND_POINTS) {
        reading.history.shift();
      }
    });
    this.lastFrameAt = t;
    this.now = t;
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
    this.parametersLoading = true;
    this.dashboardservice.getParameters().then((parameters: ParameterRO[]) => {
      this.parameters = parameters;
      this.parametersLoading = false;
    }).catch((error: any) => {
      console.error('Error occurred while fetching parameters:', error);
      this.parametersLoadError = true;
      this.parametersLoading = false;
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
    this.isSaving = true;
    this.dashboardservice.updateDashboard(this.dashboard.id, updatedDashboard).subscribe((newDashboard: DashboardRO) => {
      this.dashboard = newDashboard;
      this.isSaving = false;
      this.toastr.success(`${this.watchedItems.length} parameters saved to the preset.`, newDashboard?.name ?? 'Preset saved');
    }, (error: HttpErrorResponse) => {
      this.isSaving = false;
      if (error.error?.message != undefined) {
        console.log(error.error.message);
        this.toastr.error(error.error.message, 'Preset not saved');
      } else {
        console.log("dashboard service is down!");
        this.toastr.error('Dashboard service is unreachable. Your layout is still on screen; try saving again.', 'Preset not saved');
      }
    });
  };

  async onGetPreset(eventData: DashboardRO) {
    this.dashboard = eventData;
    await this.loadPresetByIndex();
  };

  onGotoPresetManager() {
    this.dashboard = null;
    this.watchedItems = [];
    this.readings = {};
    this.lastFrameAt = null;
    this.liveDataWebSocket.clearSubscription();
  };

  ngOnDestroy(): void {
    clearInterval(this.clockTimer);
    this.liveMessageSubscription?.unsubscribe();
    this.connectionStateSubscription?.unsubscribe();
    this.linkStateSubscription?.unsubscribe();
    this.liveDataWebSocket.unsubscribe();
  }
};
