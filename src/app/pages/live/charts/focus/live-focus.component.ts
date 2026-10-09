import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { LiveData } from 'src/app/common/interfaces/gridster/live-data.interface';
import { envelopeLevel, EnvelopeLevel, envelopePct } from '../envelope';

/**
 * The dominant instrument on the Live page: one large numeric readout plus its live
 * graph, for whichever single parameter the operator has promoted into focus. Reuses
 * app-live-graph for the graph itself; this component owns the readout, trend and
 * min/max envelope above it, fed off the same entity.dataEvent stream.
 */
@Component({
  selector: 'app-live-focus',
  templateUrl: './live-focus.component.html',
  styleUrls: ['./live-focus.component.scss']
})
export class LiveFocusComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;

  value: number | null = null;
  delta: number = 0;
  lastUpdate: number | null = null;
  now = Date.now();
  /** Flips on every frame so the template can restart the tick animation. */
  tick = false;

  private dataSubscription: Subscription;
  private ageTimer: any;

  ngOnInit() {
    this.dataSubscription = this.entity.dataEvent.subscribe((data: LiveData) => {
      if (data) {
        this.delta = this.value !== null ? data.value - this.value : 0;
        this.value = data.value;
        this.lastUpdate = Date.now();
        this.tick = !this.tick;
      }
    });
    this.ageTimer = setInterval(() => this.now = Date.now(), 1000);
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    clearInterval(this.ageTimer);
  }

  get min(): number { return this.entity.parameter.minimum; }
  get max(): number { return this.entity.parameter.maximum; }

  get hasRange(): boolean {
    return this.min != null && this.max != null && this.max > this.min;
  }

  get pct(): number {
    return envelopePct(this.value, this.min, this.max);
  }

  get level(): EnvelopeLevel {
    return envelopeLevel(this.value, this.min, this.max);
  }

  get ageLabel(): string {
    if (this.lastUpdate === null) {
      return 'Awaiting first frame';
    }
    const s = Math.floor((this.now - this.lastUpdate) / 1000);
    return s < 2 ? 'Updated just now' : `Last frame ${s}s ago`;
  }

  get isStale(): boolean {
    return this.lastUpdate !== null && this.now - this.lastUpdate > 5000;
  }
}
