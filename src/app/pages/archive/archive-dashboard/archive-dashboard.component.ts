import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { Subscription } from 'rxjs';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
import { DashboardRO } from 'src/app/common/dtos/dashboard/dashboard.ro';
import { updateDashboardDTO } from 'src/app/common/dtos/dashboard/update-dashboard.dto';
import { CreateDashboardItemDTO } from 'src/app/common/dtos/dashboard/create-dashboard-item.dto';
import { PresetsUtilsService } from 'src/app/common/services/presets-utils-service/presets-utils.service';
import { ChartType } from 'src/app/common/enums/chartType.enum';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';
import { IArchiveSettings } from 'src/app/common/interfaces/archive/telemetry-archive-settings';
import { ArchiveService } from 'src/app/common/services/archive-service/archive.service';
import { DashboardService } from 'src/app/common/services/dashboard-service/dashboard.service';
import { paramLabel } from '../../live/charts/param-status';
import { IArchiveRange } from '../archive-filter/archive-filter.component';

interface IRangeStats {
  min: number;
  max: number;
  avg: number;
  last: number;
}

interface IParameterPanel {
  parameter: ParameterRO;
  label: string;
  chartType: ChartType;
  frames: IFrame[];
  stats: IRangeStats | null;
  loading: boolean;
  error: boolean;
  subscription: Subscription | null;
}

/** Panels never get shorter than this; past it they are paged, not squeezed. */
const MIN_PANEL_HEIGHT = 260;
const PANEL_GAP = 12;
/** Below this width one panel per row reads better than two narrow ones. */
const TWO_COLUMN_MIN_WIDTH = 1000;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Archive: open a preset (a saved set of parameters, like on Live), pick a
 * start and end time, and every parameter is shown across that whole range -
 * a chart over time plus min / avg / max / last for the range. Panels fill
 * the window at a readable size; when there are more than fit they are paged
 * rather than scrolled.
 */
@Component({
  selector: 'app-archive-dashboard',
  templateUrl: './archive-dashboard.component.html',
  styleUrls: ['./archive-dashboard.component.scss']
})
export class ArchiveDashboardComponent implements OnInit, OnDestroy {

  /**
   * Most frames fetched per parameter. The archive API has no server-side
   * downsampling, so very long ranges are truncated and the page says so.
   */
  static readonly MAX_FRAMES = 5000;
  readonly maxFrames = ArchiveDashboardComponent.MAX_FRAMES;

  /** The range currently loaded into the panels; null until the first load. */
  range: IArchiveRange | null = null;

  parameters: ParameterRO[] = [];
  parametersLoadError: boolean = false;

  panels: IParameterPanel[] = [];

  /** The open preset; null shows the preset picker. */
  dashboard: DashboardRO | null = null;
  saveState: SaveState = 'idle';
  private saveStateTimer: any;

  /** Panel grid shape for the current window size (see layoutPanels). */
  panelColumns = 2;
  rowsPerPage = 2;
  page = 0;

  readonly ChartType = ChartType;

  @ViewChild('parametersDrawer') parametersDrawer?: MatDrawer;

  private panelAreaObserver: ResizeObserver;
  private panelArea: HTMLElement | null = null;

  @ViewChild('panelArea', { read: ElementRef }) set panelAreaRef(ref: ElementRef<HTMLElement> | undefined) {
    this.panelAreaObserver?.disconnect();
    this.panelArea = ref?.nativeElement ?? null;
    if (!this.panelArea) {
      return;
    }
    this.panelAreaObserver = new ResizeObserver(() => this.zone.run(() => this.layoutPanels()));
    this.panelAreaObserver.observe(this.panelArea);
  }

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly archiveService: ArchiveService,
    private readonly presetsUtils: PresetsUtilsService,
    private readonly zone: NgZone) { }

  ngOnInit(): void {
    this.parametersLoadError = false;
    this.dashboardService.getParameters().then((parameters: ParameterRO[]) => {
      this.parameters = parameters;
    }).catch((error: HttpErrorResponse) => {
      console.log(error.error?.message ?? 'dashboard service is down!');
      this.parametersLoadError = true;
    });
  }

  ngOnDestroy(): void {
    this.panels.forEach(panel => panel.subscription?.unsubscribe());
    this.panelAreaObserver?.disconnect();
    clearTimeout(this.saveStateTimer);
  }

  // ---------------------------------------------------------------------------
  // Paging: as many readable panels as the window holds, the rest on later pages
  // ---------------------------------------------------------------------------

  get perPage(): number {
    return this.panelColumns * this.rowsPerPage;
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.panels.length / this.perPage));
  }

  get pagedPanels(): IParameterPanel[] {
    const start = this.page * this.perPage;
    return this.panels.slice(start, start + this.perPage);
  }

  /** Rows actually used, so one or two panels fill the window instead of leaving empty rows. */
  get gridRows(): number {
    return Math.max(1, Math.min(this.rowsPerPage, Math.ceil(this.panels.length / this.panelColumns)));
  }

  get pageIndexes(): number[] {
    return Array.from({ length: this.pageCount }, (_, i) => i);
  }

  get pageFirst(): number {
    return this.page * this.perPage + 1;
  }

  get pageLast(): number {
    return Math.min(this.panels.length, (this.page + 1) * this.perPage);
  }

  goToPage(page: number): void {
    this.page = Math.max(0, Math.min(this.pageCount - 1, page));
  }

  private layoutPanels(): void {
    if (!this.panelArea) {
      return;
    }
    const { width, height } = this.panelArea.getBoundingClientRect();
    this.panelColumns = this.panels.length > 1 && width >= TWO_COLUMN_MIN_WIDTH ? 2 : 1;
    this.rowsPerPage = Math.max(1, Math.floor((height + PANEL_GAP) / (MIN_PANEL_HEIGHT + PANEL_GAP)));
    this.goToPage(this.page);
  }

  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  onOpenPreset(dashboard: DashboardRO): void {
    this.dashboard = dashboard;
    this.page = 0;
    this.panels = (dashboard.items ?? []).map(item =>
      this.newPanel(item.parameter, item.chartType === ChartType.TABLE ? ChartType.TABLE : ChartType.GRAPH));
    this.layoutPanels();
    if (this.range) {
      this.panels.forEach(panel => this.fetchPanel(panel));
    }
  }

  createPreset(presetName: string): void {
    const preset = this.presetsUtils.setDashboard(presetName, false);
    this.dashboardService.createDashboard(preset).subscribe((created: DashboardRO) => {
      this.dashboardService.getDashboard(created.id).subscribe((dashboard: DashboardRO) => {
        this.onOpenPreset(dashboard);
        // A new preset is empty: go straight to choosing its parameters.
        setTimeout(() => this.parametersDrawer?.open());
      });
    }, (error: HttpErrorResponse) => {
      console.log(error.error?.message ?? 'dashboard service is down!');
    });
  }

  onBackToPresets(): void {
    this.panels.forEach(panel => panel.subscription?.unsubscribe());
    this.panels = [];
    this.dashboard = null;
    this.range = null;
    this.saveState = 'idle';
  }

  savePreset(): void {
    if (!this.dashboard || this.saveState === 'saving') {
      return;
    }
    // Stored in the same shape Live uses; x/y record the panel order.
    const items = this.panels.map((panel, index) => new CreateDashboardItemDTO({
      cols: 1, rows: 1, x: index % 2, y: Math.floor(index / 2),
      chart: this.presetsUtils.initGridsterItem(panel.parameter, panel.chartType)
    }));
    const update = new updateDashboardDTO(items, this.dashboard.name, this.dashboard.description);
    this.saveState = 'saving';
    this.dashboardService.updateDashboard(this.dashboard.id, update).subscribe((saved: DashboardRO) => {
      this.dashboard = saved ?? this.dashboard;
      this.showSaveState('saved');
    }, (error: HttpErrorResponse) => {
      console.log(error.error?.message ?? 'dashboard service is down!');
      this.showSaveState('error');
    });
  }

  private showSaveState(state: SaveState): void {
    this.saveState = state;
    clearTimeout(this.saveStateTimer);
    this.saveStateTimer = setTimeout(() => this.saveState = 'idle', state === 'error' ? 4000 : 2000);
  }

  /** The loaded range holds more frames than one request returns. */
  get isTruncated(): boolean {
    return !!this.range && this.range.totalFrames > this.maxFrames;
  }

  /** Time of the last frame actually shown, when the range was truncated. */
  get shownUntil(): Date | null {
    const times = this.panels
      .filter(p => p.frames.length > 0)
      .map(p => new Date(p.frames[p.frames.length - 1].time).getTime());
    return times.length ? new Date(Math.max(...times)) : null;
  }

  onLoad(range: IArchiveRange): void {
    this.range = range;
    this.panels.forEach(panel => this.fetchPanel(panel));
  }

  isParameterSelected(parameter: ParameterRO): boolean {
    return this.panels.some(p => p.parameter.id === parameter.id);
  }

  onToggleParameter(parameter: ParameterRO): void {
    const index = this.panels.findIndex(p => p.parameter.id === parameter.id);
    if (index !== -1) {
      this.panels[index].subscription?.unsubscribe();
      this.panels.splice(index, 1);
      this.layoutPanels();
      return;
    }
    const panel = this.newPanel(parameter, ChartType.GRAPH);
    this.panels.push(panel);
    this.layoutPanels();
    // Show the page the new panel landed on.
    this.goToPage(this.pageCount - 1);
    if (this.range) {
      this.fetchPanel(panel);
    }
  }

  private newPanel(parameter: ParameterRO, chartType: ChartType): IParameterPanel {
    return {
      parameter,
      label: paramLabel(parameter.parameterName),
      chartType,
      frames: [],
      stats: null,
      loading: false,
      error: false,
      subscription: null
    };
  }

  onRemovePanel(panel: IParameterPanel): void {
    this.onToggleParameter(panel.parameter);
  }

  onChangeChartType(panel: IParameterPanel, chartType: ChartType): void {
    panel.chartType = chartType;
  }

  trackByParameterId(_index: number, panel: IParameterPanel): string {
    return panel.parameter.id;
  }

  private fetchPanel(panel: IParameterPanel): void {
    panel.subscription?.unsubscribe();
    panel.loading = true;
    panel.error = false;
    const { startTime, endTime } = this.range;
    panel.subscription = this.archiveService
      .getFrames(panel.parameter.parameterName, this.maxFrames, 0, startTime, endTime)
      .subscribe(
        (data: IArchiveSettings) => {
          panel.loading = false;
          panel.frames = data?.values ?? [];
          panel.stats = this.statsFor(panel.frames);
        },
        () => {
          panel.loading = false;
          panel.error = true;
          panel.frames = [];
          panel.stats = null;
        }
      );
  }

  private statsFor(frames: IFrame[]): IRangeStats | null {
    if (!frames.length) {
      return null;
    }
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const f of frames) {
      min = Math.min(min, f.value);
      max = Math.max(max, f.value);
      sum += f.value;
    }
    return { min, max, avg: Math.round((sum / frames.length) * 10) / 10, last: frames[frames.length - 1].value };
  }
}
