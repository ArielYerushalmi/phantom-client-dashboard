import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { Subscription } from 'rxjs';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
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

/**
 * Archive: pick a start and end time, load it, and every selected parameter
 * is shown across that whole range - a chart over time plus min / avg / max /
 * last for the range. Parameters can be chosen before or after loading;
 * adding one to a loaded range fetches it for the same range.
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

  readonly ChartType = ChartType;

  @ViewChild('parametersDrawer') parametersDrawer?: MatDrawer;

  constructor(private readonly dashboardService: DashboardService, private readonly archiveService: ArchiveService) { }

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
  }

  /**
   * Archive panels are for reading detail, so they keep a readable size
   * (two columns, a minimum height set in the stylesheet) rather than
   * shrinking to fit any number into the window; extra panels scroll.
   */
  get panelColumns(): number {
    return Math.max(1, Math.min(this.panels.length, 2));
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
    if (this.panels.length === 0) {
      this.parametersDrawer?.open();
    }
  }

  isParameterSelected(parameter: ParameterRO): boolean {
    return this.panels.some(p => p.parameter.id === parameter.id);
  }

  onToggleParameter(parameter: ParameterRO): void {
    const index = this.panels.findIndex(p => p.parameter.id === parameter.id);
    if (index !== -1) {
      this.panels[index].subscription?.unsubscribe();
      this.panels.splice(index, 1);
      return;
    }
    const panel: IParameterPanel = {
      parameter,
      label: paramLabel(parameter.parameterName),
      chartType: ChartType.GRAPH,
      frames: [],
      stats: null,
      loading: false,
      error: false,
      subscription: null
    };
    this.panels.push(panel);
    if (this.range) {
      this.fetchPanel(panel);
    }
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
