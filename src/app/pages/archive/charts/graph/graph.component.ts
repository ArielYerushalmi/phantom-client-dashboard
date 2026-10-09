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

  private resizeObserver: ResizeObserver;

  graphValues: any[] = [];
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = true;
  showLegend: boolean = false;
  showXAxisLabel: boolean = false;
  showYAxisLabel: boolean = false;
  colorScheme = {
    domain: ['#56b6c6']
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
    this.graphValues = [{
      name: this.parameter?.parameterName ?? '',
      // Frame times arrive as ISO strings over JSON; as Dates the chart uses a
      // real time scale instead of treating each timestamp as an ordinal label.
      series: arrayOfFrames.map((item: IFrame) => ({ value: item.value, name: new Date(item.time) }))
    }];
  }

  public formatTime(date: string): string {
    return new Date(date).toLocaleTimeString([], { hour12: false });
  }

}
