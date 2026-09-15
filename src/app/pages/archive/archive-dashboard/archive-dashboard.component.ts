import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
import { ChartType } from 'src/app/common/enums/chartType.enum';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';
import { IArchiveSettings } from 'src/app/common/interfaces/archive/telemetry-archive-settings';
import { ArchiveService } from 'src/app/common/services/archive-service/archive.service';
import { DashboardService } from 'src/app/common/services/dashboard-service/dashboard.service';
import { IArchiveRange } from '../archive-filter/archive-filter.component';

interface IWindowOption {
  label: string;
  ms: number;
}

interface IParameterPanel {
  parameter: ParameterRO;
  chartType: ChartType;
  frames: IFrame[];
  nearest: IFrame | null;
  loading: boolean;
  error: boolean;
  scrubSubject: Subject<Date>;
  subscription: Subscription;
}

/**
 * Main Archive view: a DVR-style timeline scrubber replaces the old
 * filter-form-then-static-grid flow. The operator confirms a coarse time
 * range (via ArchiveFilterComponent, now a compact range-setup strip), then
 * drags/clicks the scrubber to move a playhead through that range. Each
 * selected parameter gets its own small window of frames fetched "around"
 * the playhead (skipFrames/startTime/endTime derived from scrub position),
 * refetched as the playhead moves - debounced so dragging doesn't spam the
 * backend, and raced safely via switchMap so a slow stale request can never
 * clobber a fresher one.
 */
@Component({
  selector: 'app-archive-dashboard',
  templateUrl: './archive-dashboard.component.html',
  styleUrls: ['./archive-dashboard.component.scss']
})
export class ArchiveDashboardComponent implements OnInit, OnDestroy {

  private static readonly FRAME_CAP = 500;
  private static readonly SCRUB_DEBOUNCE_MS = 180;

  range: IArchiveRange | null = null;
  scrubTime: Date | null = null;

  parameters: ParameterRO[] = [];
  parametersLoadError: boolean = false;

  panels: IParameterPanel[] = [];

  readonly windowOptions: IWindowOption[] = [
    { label: '10s window', ms: 10 * 1000 },
    { label: '30s window', ms: 30 * 1000 },
    { label: '1m window', ms: 60 * 1000 },
    { label: '5m window', ms: 5 * 60 * 1000 },
    { label: '15m window', ms: 15 * 60 * 1000 },
    { label: '1h window', ms: 60 * 60 * 1000 },
  ];
  windowMs: number = this.windowOptions[2].ms;

  readonly ChartType = ChartType;

  private readonly scrubSubject = new Subject<Date>();
  private scrubSubscription: Subscription;

  constructor(private readonly dashboardService: DashboardService, private readonly archiveService: ArchiveService) { }

  ngOnInit(): void {
    this.parametersLoadError = false;
    this.dashboardService.getParameters().then((parameters: ParameterRO[]) => {
      this.parameters = parameters;
    }).catch((error: HttpErrorResponse) => {
      console.log(error.error?.message ?? 'dashboard service is down!');
      this.parametersLoadError = true;
    });

    this.scrubSubscription = this.scrubSubject.pipe(
      debounceTime(ArchiveDashboardComponent.SCRUB_DEBOUNCE_MS),
      distinctUntilChanged((a: Date, b: Date) => a.getTime() === b.getTime())
    ).subscribe((t: Date) => this.fetchAllPanels(t));
  }

  ngOnDestroy(): void {
    this.scrubSubscription?.unsubscribe();
    this.panels.forEach(panel => panel.subscription?.unsubscribe());
  }

  onRangeConfirmed(range: IArchiveRange): void {
    this.range = range;
    this.scrubTime = range.startTime;
    this.fetchAllPanels(range.startTime);
  }

  // Called continuously while dragging/clicking the scrubber. Updates the
  // playhead position instantly (cheap, local) and pushes into the debounced
  // subject that actually triggers backend fetches.
  onScrub(t: Date): void {
    this.scrubTime = t;
    this.scrubSubject.next(t);
  }

  onWindowChange(): void {
    if (this.scrubTime) {
      this.fetchAllPanels(this.scrubTime);
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
    const panel = this.createPanel(parameter);
    this.panels.push(panel);
    if (this.scrubTime) {
      panel.scrubSubject.next(this.scrubTime);
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

  private fetchAllPanels(t: Date): void {
    this.panels.forEach(panel => panel.scrubSubject.next(t));
  }

  private createPanel(parameter: ParameterRO): IParameterPanel {
    const scrubSubject = new Subject<Date>();
    const panel: IParameterPanel = {
      parameter,
      chartType: ChartType.GRAPH,
      frames: [],
      nearest: null,
      loading: false,
      error: false,
      scrubSubject,
      subscription: null
    };

    panel.subscription = scrubSubject.pipe(
      switchMap((t: Date) => {
        panel.loading = true;
        panel.error = false;
        const { startTime, endTime } = this.windowFor(t);
        return this.archiveService.getFrames(parameter.parameterName, ArchiveDashboardComponent.FRAME_CAP, 0, startTime, endTime);
      })
    ).subscribe(
      (data: IArchiveSettings) => {
        panel.loading = false;
        panel.frames = data?.values ?? [];
        panel.nearest = this.findNearest(panel.frames, this.scrubTime);
      },
      () => {
        panel.loading = false;
        panel.error = true;
        panel.frames = [];
        panel.nearest = null;
      }
    );

    return panel;
  }

  // Translates a scrub position into the GetTime call's time window: a fixed
  // duration centered on the playhead, clamped to the confirmed coarse
  // range. skipFrames stays 0 because the window is already time-scoped;
  // numberOfFrames is capped as a safety net for densely-sampled parameters.
  private windowFor(t: Date): { startTime: Date; endTime: Date } {
    const half = this.windowMs / 2;
    let startMs = t.getTime() - half;
    let endMs = t.getTime() + half;
    if (this.range) {
      startMs = Math.max(startMs, this.range.startTime.getTime());
      endMs = Math.min(endMs, this.range.endTime.getTime());
    }
    if (startMs >= endMs) {
      endMs = startMs + 1000;
    }
    return { startTime: new Date(startMs), endTime: new Date(endMs) };
  }

  private findNearest(frames: IFrame[], t: Date | null): IFrame | null {
    if (!frames?.length || !t) { return null; }
    let best = frames[0];
    let bestDiff = Math.abs(new Date(best.time).getTime() - t.getTime());
    for (const f of frames) {
      const diff = Math.abs(new Date(f.time).getTime() - t.getTime());
      if (diff < bestDiff) {
        best = f;
        bestDiff = diff;
      }
    }
    return best;
  }
}
