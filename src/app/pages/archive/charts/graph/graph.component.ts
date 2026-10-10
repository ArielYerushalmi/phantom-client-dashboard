import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';

/**
 * Renders one parameter's frames as a line chart. Previously this subscribed
 * to a per-parameter EventEmitter pushed through a gridster item; the
 * scrubber-driven page instead fetches a fresh frame window per scrub and
 * hands it down as a plain @Input, so a straightforward ngOnChanges is all
 * that's needed here now.
 */
@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnChanges, OnDestroy {
  @Input() parameter: ParameterRO;
  @Input() frames: IFrame[] = [];

  private static readonly MAX_BUCKETS = 120;

  private resizeObserver: ResizeObserver;
  private spanMs = 0;

  graphValues: any[] = [];
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = true;
  showLegend: boolean = false;
  showXAxisLabel: boolean = false;
  showYAxisLabel: boolean = false;
  colorScheme = {
    domain: ['#4c8dd9']
  }

  constructor(private readonly hostRef: ElementRef<HTMLElement>) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.applyChart(this.frames ?? []);

    if (!this.resizeObserver) {
      // Watch the component's own host element instead of looking an
      // element up by parameter name - the old approach broke as soon as
      // two charts for different parameters existed on the page at once
      // (duplicate DOM ids).
      this.resizeObserver = new ResizeObserver(() => {
        this.graphValues = [...this.graphValues];
      });
      this.resizeObserver.observe(this.hostRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  applyChart(arrayOfFrames: IFrame[]): void {
    // Frame times arrive as ISO strings over JSON; as Dates the chart uses a
    // real time scale instead of treating each timestamp as an ordinal label.
    const points = arrayOfFrames.map((item: IFrame) => ({ value: item.value, name: new Date(item.time) }));
    if (points.length > 1) {
      this.spanMs = points[points.length - 1].name.getTime() - points[0].name.getTime();
    }
    this.graphValues = [{
      name: this.parameter?.parameterName ?? '',
      series: GraphComponent.thin(points, GraphComponent.MAX_BUCKETS)
    }];
  }

  /** Axis labels: time of day for short ranges, date and time once a range spans days. */
  public formatTime = (date: Date | string): string => {
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const time = this.spanMs > 6 * 60 * 60 * 1000
      ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
      : `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return this.spanMs > 24 * 60 * 60 * 1000 ? `${d.getDate()}/${d.getMonth() + 1} ${time}` : time;
  }

  /**
   * Thousands of points can't be told apart on a panel-sized chart: a line
   * through every sample of a jumpy signal just fills the box. Above the
   * bucket count, plot each time bucket's average as the line and its
   * min/max as a shaded band (ngx-charts draws `min`/`max` as a range), so
   * both the typical value and the extremes stay readable.
   */
  private static thin(points: { value: number; name: Date }[], buckets: number): { value: number; name: Date; min?: number; max?: number }[] {
    if (points.length <= buckets) {
      return points;
    }
    const size = points.length / buckets;
    const out: { value: number; name: Date; min: number; max: number }[] = [];
    for (let b = 0; b < buckets; b++) {
      const slice = points.slice(Math.floor(b * size), Math.floor((b + 1) * size));
      if (!slice.length) {
        continue;
      }
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      for (const p of slice) {
        min = Math.min(min, p.value);
        max = Math.max(max, p.value);
        sum += p.value;
      }
      const mid = slice[Math.floor(slice.length / 2)].name;
      out.push({ name: mid, value: Math.round((sum / slice.length) * 10) / 10, min, max });
    }
    return out;
  }

}
