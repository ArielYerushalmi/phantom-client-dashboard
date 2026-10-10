import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
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

/** Board sizing, in px. Must match the board/section/grid spacing in the stylesheet. */
const BOARD = {
  gap: 8,             // .tile-grid gap
  heading: 26,        // section heading + its gap to the grid
  sectionGap: 14,     // gap between sections
  floorTileWidth: 150, // narrowest tile allowed when squeezing to fit
  maxTileWidth: 320,  // wider than this reads as stretched
  minRow: 96,         // prefer more columns over rows shorter than this
  maxRow: 220,        // few parameters: don't blow tiles up to fill the screen
  compactRow: 128     // below this, tiles drop secondary detail
};

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

  /** Board grid, sized so every watched parameter fits the window without scrolling. */
  boardCols = 6;
  boardRowHeight = BOARD.maxRow;
  boardCompact = false;
  private boardSize = { width: 0, height: 0 };
  private boardObserver?: ResizeObserver;

  @ViewChild('board') set boardElement(ref: ElementRef<HTMLElement> | undefined) {
    this.boardObserver?.disconnect();
    if (!ref) {
      return;
    }
    this.boardObserver = new ResizeObserver(([entry]) => this.zone.run(() => {
      this.boardSize = { width: entry.contentRect.width, height: entry.contentRect.height };
      this.layoutBoard();
    }));
    this.boardObserver.observe(ref.nativeElement);
  }

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

  constructor(private readonly dashboardservice: DashboardService, private readonly presetsUtils: PresetsUtilsService, private readonly liveDataWebSocket: LtsService, private readonly toastr: ToastrService, private readonly zone: NgZone) { }

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

  /**
   * Picks the column count giving the largest tiles that still let both
   * sections fit the board's height, so nothing ever needs scrolling. If no
   * count keeps rows at a comfortable height, uses the most columns allowed
   * and lets tiles go compact.
   */
  private layoutBoard(): void {
    const { width, height } = this.boardSize;
    const quantities = this.quantityItems.length;
    const states = this.stateItems.length;
    if (!width || !height || quantities + states === 0) {
      return;
    }
    const sections = (quantities > 0 ? 1 : 0) + (states > 0 ? 1 : 0);
    const chrome = sections * BOARD.heading + (sections - 1) * BOARD.sectionGap;
    const colsFor = (tileWidth: number) => Math.max(1, Math.floor((width + BOARD.gap) / (tileWidth + BOARD.gap)));
    const rowHeightFor = (cols: number) => {
      const rows = Math.ceil(quantities / cols) + Math.ceil(states / cols);
      return (height - chrome - (rows - sections) * BOARD.gap) / rows;
    };

    const maxCols = colsFor(BOARD.floorTileWidth);
    let cols = maxCols;
    let bestArea = 0;
    for (let c = 1; c <= maxCols; c++) {
      const tileWidth = (width - (c - 1) * BOARD.gap) / c;
      const rowHeight = Math.min(BOARD.maxRow, rowHeightFor(c));
      if (tileWidth > BOARD.maxTileWidth || rowHeight < BOARD.minRow) {
        continue;
      }
      if (tileWidth * rowHeight > bestArea) {
        bestArea = tileWidth * rowHeight;
        cols = c;
      }
    }

    this.boardCols = cols;
    this.boardRowHeight = Math.floor(Math.min(BOARD.maxRow, rowHeightFor(cols)));
    this.boardCompact = this.boardRowHeight < BOARD.compactRow;
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
      this.layoutBoard();
    };
  };

  async onRemove(parameter: ParameterRO): Promise<void> {
    let index = this.presetsUtils.findItem(this.watchedItems, parameter);
    if (index != -1) {
      this.watchedItems.splice(index, 1);
    };
    delete this.readings[parameter.parameterName];
    this.layoutBoard();

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
    this.boardObserver?.disconnect();
    this.liveMessageSubscription?.unsubscribe();
    this.connectionStateSubscription?.unsubscribe();
    this.linkStateSubscription?.unsubscribe();
    this.liveDataWebSocket.unsubscribe();
  }
};
