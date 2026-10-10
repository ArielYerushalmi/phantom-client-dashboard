import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
import { hasRange, isDiscrete, isFaultFlag, paramLabel, ParamStatus, paramStatus, rangePct } from '../param-status';

/** Latest state of one parameter, owned by the live page and shared with its tile. */
export interface ParamReading {
  value: number | null;
  lastUpdate: number | null;
  /** When a discrete value last changed state. */
  changedAt: number | null;
  /** Most recent values, oldest first, at most TREND_POINTS long. */
  history: number[];
}

/** One sample per frame (~1 Hz), so this is roughly the last minute. */
export const TREND_POINTS = 60;

const W = 120;
const H = 32;

/**
 * One parameter on the live board. Every parameter gets the same tile so the
 * whole picture can be read at a glance: name, value, where it sits in its
 * range, and the last minute of trend. Discrete 0/1 parameters show their
 * state and how long they have held it instead of a scale.
 */
@Component({
  selector: 'app-param-tile',
  templateUrl: './param-tile.component.html',
  styleUrls: ['./param-tile.component.scss']
})
export class ParamTileComponent {
  @Input() parameter: ParameterRO;
  @Input() reading: ParamReading;
  @Input() now: number;
  /** The live link is down: show the last values, clearly marked as not current. */
  @Input() frozen = false;
  @Output() remove = new EventEmitter<void>();

  get label(): string { return paramLabel(this.parameter.parameterName); }
  get discrete(): boolean { return isDiscrete(this.parameter); }
  get ranged(): boolean { return hasRange(this.parameter); }
  get value(): number | null { return this.reading?.value ?? null; }

  get status(): ParamStatus {
    return paramStatus(this.parameter, this.value, this.reading?.lastUpdate ?? null, this.now);
  }

  get statusText(): string | null {
    if (this.frozen && this.reading?.lastUpdate) {
      return 'Link lost';
    }
    switch (this.status) {
      case 'waiting': return 'No data';
      case 'stale': return `No data ${this.secondsSince(this.reading.lastUpdate)}s`;
      case 'alarm': return this.discrete ? 'Fault' : (this.value < this.parameter.minimum ? 'Below range' : 'Above range');
      default: return null;
    }
  }

  get stateText(): string {
    if (this.value === null) {
      return '—';
    }
    return this.value >= 1 ? 'ON' : 'OFF';
  }

  get heldFor(): string {
    if (this.reading?.changedAt == null) {
      return '';
    }
    const s = this.secondsSince(this.reading.changedAt);
    return s < 60 ? `for ${s}s` : `for ${Math.floor(s / 60)}m ${s % 60}s`;
  }

  get faultFlag(): boolean { return isFaultFlag(this.parameter); }

  get markerPct(): number { return rangePct(this.parameter, this.value); }

  /** Trend in a fixed time frame: the newest sample is always at the right edge. */
  get trendPath(): string {
    const history = this.reading?.history ?? [];
    if (history.length < 2) {
      return '';
    }
    const [lo, hi] = this.trendBounds(history);
    const span = hi - lo || 1;
    const offset = TREND_POINTS - history.length;
    const x = (i: number) => (((offset + i) / (TREND_POINTS - 1)) * W).toFixed(1);
    const y = (v: number) => (H - 2 - ((Math.min(hi, Math.max(lo, v)) - lo) / span) * (H - 4)).toFixed(1);

    let d = `M${x(0)},${y(history[0])}`;
    for (let i = 1; i < history.length; i++) {
      // States hold until they change, so draw discrete parameters as steps.
      d += this.discrete ? ` H${x(i)} V${y(history[i])}` : ` L${x(i)},${y(history[i])}`;
    }
    return d;
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }

  /**
   * Ranged parameters plot against their full range so tiles are comparable and
   * small noise isn't blown up to fill the box; others fall back to the data's own span.
   */
  private trendBounds(history: number[]): [number, number] {
    if (this.discrete) {
      return [0, 1];
    }
    if (this.ranged) {
      return [this.parameter.minimum, this.parameter.maximum];
    }
    return [Math.min(...history), Math.max(...history)];
  }

  private secondsSince(t: number): number {
    return Math.max(0, Math.floor((this.now - t) / 1000));
  }
}
