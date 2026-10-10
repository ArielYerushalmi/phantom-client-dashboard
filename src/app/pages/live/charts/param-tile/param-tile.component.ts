import { AfterViewChecked, Component, DoCheck, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
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
/** Horizontal distance between two trend samples, in SVG units. */
const TREND_STEP = W / (TREND_POINTS - 1);
/** How long a value takes to count to its new reading. Short enough to never lag the data. */
const VALUE_TWEEN_MS = 450;

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
export class ParamTileComponent implements DoCheck, AfterViewChecked, OnDestroy {
  @Input() parameter: ParameterRO;
  @Input() reading: ParamReading;
  @Input() now: number;
  /** The live link is down: show the last values, clearly marked as not current. */
  @Input() frozen = false;
  /** Short tile (many parameters on a small screen): keep value and range, drop secondary text. */
  @Input() compact = false;
  @Output() remove = new EventEmitter<void>();

  @ViewChild('valueEl') valueEl?: ElementRef<HTMLElement>;
  @ViewChild('stateEl') stateEl?: ElementRef<HTMLElement>;
  @ViewChild('trendEl') trendEl?: ElementRef<SVGPathElement>;

  /** Which way the last change went, shown as a small arrow next to the units. */
  delta: 'up' | 'down' | null = null;

  // Motion bookkeeping: what changed since the view last rendered.
  private target: number | null | undefined = undefined;
  private shown: number | null = null;
  private tweenFrame = 0;
  private seenUpdate: number | null = null;
  private updateInterval = 1000;
  private slidePending = false;
  private statePending = false;

  constructor(private readonly zone: NgZone) { }

  ngDoCheck(): void {
    const value = this.value;
    if (value !== this.target) {
      const previous = this.target;
      this.target = value;
      this.delta = previous == null || value == null || value === previous ? null : value > previous ? 'up' : 'down';
      this.statePending = previous !== undefined;
      this.animateValue(value);
    }
    const update = this.reading?.lastUpdate ?? null;
    if (update !== this.seenUpdate) {
      if (this.seenUpdate != null && update != null) {
        this.updateInterval = Math.min(2000, Math.max(250, update - this.seenUpdate));
        this.slidePending = true;
      }
      this.seenUpdate = update;
    }
  }

  ngAfterViewChecked(): void {
    if (this.slidePending) {
      this.slidePending = false;
      // The path was just redrawn with the newest sample at the right edge and
      // everything one step further left. Start it one step to the right and
      // glide back over one frame interval, so the trend scrolls instead of jumping.
      const path = this.trendEl?.nativeElement;
      if (path && path.animate && !reducedMotion()) {
        path.animate(
          [{ transform: `translateX(${TREND_STEP}px)` }, { transform: 'translateX(0)' }],
          { duration: this.updateInterval, easing: 'linear' });
      }
    }
    if (this.statePending) {
      this.statePending = false;
      const state = this.stateEl?.nativeElement;
      if (state && state.animate && !reducedMotion()) {
        state.animate(
          [{ opacity: 0, transform: 'translateY(-3px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      }
    }
    if (this.valueEl && !this.valueEl.nativeElement.textContent) {
      this.writeValue(this.shown);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.tweenFrame);
  }

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

  /**
   * Count the shown number from where it is to the new reading. Runs outside
   * Angular and writes the text directly, so a board full of tiles doesn't
   * trigger change detection every animation frame.
   */
  private animateValue(to: number | null): void {
    cancelAnimationFrame(this.tweenFrame);
    const from = this.shown;
    if (to === null || from === null || reducedMotion()) {
      this.shown = to;
      this.writeValue(to);
      return;
    }
    const decimals = Math.max(ParamTileComponent.decimalsOf(from), ParamTileComponent.decimalsOf(to));
    const start = performance.now();
    this.zone.runOutsideAngular(() => {
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / VALUE_TWEEN_MS);
        const eased = 1 - Math.pow(1 - k, 3);
        this.shown = k === 1 ? to : from + (to - from) * eased;
        this.writeValue(this.shown, decimals);
        if (k < 1) {
          this.tweenFrame = requestAnimationFrame(step);
        }
      };
      this.tweenFrame = requestAnimationFrame(step);
    });
  }

  private writeValue(value: number | null, decimals = ParamTileComponent.decimalsOf(value)): void {
    const el = this.valueEl?.nativeElement;
    if (el) {
      el.textContent = value === null ? '—' : value.toFixed(decimals);
    }
  }

  private static decimalsOf(value: number | null): number {
    if (value === null || Number.isInteger(value)) {
      return 0;
    }
    return Math.min(2, (value.toString().split('.')[1] ?? '').length);
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
