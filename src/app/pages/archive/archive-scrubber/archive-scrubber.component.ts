import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';

interface ITick {
  pct: number;
  label: string;
}

const PLAYBACK_TICK_MS = 500;
const PLAYBACK_SPEEDS = [1, 4, 16, 60];

/**
 * Presentational DVR-style timeline scrubber: a horizontal track spanning
 * [rangeStart, rangeEnd] with a draggable/clickable playhead and transport
 * controls (step, jump, play/pause at 1x-60x). Emits the scrubbed-to time on
 * every move; owns no data-fetching of its own so it stays trivially
 * reusable/testable - the parent (ArchiveDashboardComponent) decides how to
 * debounce `scrub` events into backend calls. Playback ticks every 500ms,
 * comfortably above the parent's 180ms debounce, so every step fetches.
 */
@Component({
  selector: 'app-archive-scrubber',
  templateUrl: './archive-scrubber.component.html',
  styleUrls: ['./archive-scrubber.component.scss']
})
export class ArchiveScrubberComponent implements OnChanges, OnDestroy {
  @Input() rangeStart: Date;
  @Input() rangeEnd: Date;
  @Input() value: Date;
  @Input() windowMs: number = 0;
  @Input() disabled: boolean = false;

  @Output() scrub = new EventEmitter<Date>();

  @ViewChild('track', { static: true }) trackRef: ElementRef<HTMLDivElement>;

  currentValue: Date;
  isDragging: boolean = false;
  ticks: ITick[] = [];

  hoverPct: number | null = null;
  hoverLabel: string = '';

  isPlaying: boolean = false;
  speed: number = PLAYBACK_SPEEDS[0];

  private playTimer: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value && !this.isDragging) {
      this.currentValue = this.value;
    }
    if (changes.rangeStart || changes.rangeEnd) {
      this.rebuildTicks();
      this.pause();
    }
    if (changes.disabled && this.disabled) {
      this.pause();
    }
  }

  ngOnDestroy(): void {
    this.pause();
  }

  get playheadPct(): number {
    return this.fractionFor(this.currentValue) * 100;
  }

  get playheadLabel(): string {
    return this.currentValue ? this.formatPrecise(this.currentValue) : '';
  }

  get atEnd(): boolean {
    return !!this.currentValue && !!this.rangeEnd && this.currentValue.getTime() >= this.rangeEnd.getTime();
  }

  get bandLeftPct(): number {
    if (!this.windowMs) { return this.playheadPct; }
    const half = this.windowMs / 2;
    const t = this.currentValue ? this.currentValue.getTime() : this.rangeStart?.getTime();
    return this.fractionForTime(t - half) * 100;
  }

  get bandWidthPct(): number {
    if (!this.windowMs) { return 0; }
    return Math.max(0, this.bandRightPct - this.bandLeftPct);
  }

  private get bandRightPct(): number {
    const half = this.windowMs / 2;
    const t = this.currentValue ? this.currentValue.getTime() : this.rangeStart?.getTime();
    return this.fractionForTime(t + half) * 100;
  }

  private get spanMs(): number {
    return this.rangeStart && this.rangeEnd ? this.rangeEnd.getTime() - this.rangeStart.getTime() : 0;
  }

  private get smallStep(): number {
    return Math.max(1000, this.spanMs / 200);
  }

  private get bigStep(): number {
    return Math.max(this.smallStep, this.spanMs / 20);
  }

  private fractionFor(d: Date): number {
    if (!d) { return 0; }
    return this.fractionForTime(d.getTime());
  }

  private fractionForTime(ms: number): number {
    if (!this.rangeStart || !this.rangeEnd) { return 0; }
    const span = this.spanMs;
    if (span <= 0) { return 0; }
    return Math.min(1, Math.max(0, (ms - this.rangeStart.getTime()) / span));
  }

  private rebuildTicks(): void {
    if (!this.rangeStart || !this.rangeEnd) {
      this.ticks = [];
      return;
    }
    const count = 6;
    const span = this.spanMs;
    const ticks: ITick[] = [];
    for (let i = 0; i <= count; i++) {
      const pct = (i / count) * 100;
      const t = new Date(this.rangeStart.getTime() + (i / count) * span);
      ticks.push({ pct, label: this.formatTick(t) });
    }
    this.ticks = ticks;
  }

  private formatTick(d: Date): string {
    const span = this.spanMs;
    const DAY = 24 * 60 * 60 * 1000;
    if (span <= DAY) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
    if (span <= 31 * DAY) {
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private formatPrecise(d: Date): string {
    const DAY = 24 * 60 * 60 * 1000;
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return this.spanMs > DAY ? `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}` : time;
  }

  // --- Pointer -------------------------------------------------------------

  onTrackPointerDown(ev: PointerEvent): void {
    if (this.disabled || !this.rangeStart || !this.rangeEnd) { return; }
    this.pause();
    this.isDragging = true;
    this.hoverPct = null;
    try {
      this.trackRef.nativeElement.setPointerCapture(ev.pointerId);
    } catch { /* pointer capture is best-effort */ }
    this.updateFromClientX(ev.clientX);
  }

  onTrackPointerMove(ev: PointerEvent): void {
    if (this.isDragging) {
      this.updateFromClientX(ev.clientX);
      return;
    }
    if (this.disabled || !this.rangeStart || !this.rangeEnd || ev.pointerType === 'touch') { return; }
    const fraction = this.fractionFromClientX(ev.clientX);
    this.hoverPct = fraction * 100;
    this.hoverLabel = this.formatPrecise(this.timeAtFraction(fraction));
  }

  onTrackPointerLeave(): void {
    this.hoverPct = null;
  }

  onTrackPointerUp(ev: PointerEvent): void {
    if (!this.isDragging) { return; }
    this.isDragging = false;
    this.updateFromClientX(ev.clientX);
    try {
      this.trackRef.nativeElement.releasePointerCapture(ev.pointerId);
    } catch { /* no-op */ }
  }

  onHandleKeydown(ev: KeyboardEvent): void {
    if (this.disabled || !this.rangeStart || !this.rangeEnd || !this.currentValue) { return; }
    let next: number | null = null;
    switch (ev.key) {
      case 'ArrowLeft': next = this.currentValue.getTime() - this.smallStep; break;
      case 'ArrowRight': next = this.currentValue.getTime() + this.smallStep; break;
      case 'PageDown': next = this.currentValue.getTime() - this.bigStep; break;
      case 'PageUp': next = this.currentValue.getTime() + this.bigStep; break;
      case 'Home': next = this.rangeStart.getTime(); break;
      case 'End': next = this.rangeEnd.getTime(); break;
      case ' ': this.togglePlay(); ev.preventDefault(); return;
      default: return;
    }
    ev.preventDefault();
    this.seek(next);
  }

  // --- Transport -----------------------------------------------------------

  jumpToStart(): void {
    this.pause();
    this.seek(this.rangeStart?.getTime());
  }

  jumpToEnd(): void {
    this.pause();
    this.seek(this.rangeEnd?.getTime());
  }

  stepBack(): void {
    this.pause();
    this.seek((this.currentValue ?? this.rangeStart)?.getTime() - this.smallStep);
  }

  stepForward(): void {
    this.pause();
    this.seek((this.currentValue ?? this.rangeStart)?.getTime() + this.smallStep);
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
      return;
    }
    if (this.disabled || !this.rangeStart || !this.rangeEnd) { return; }
    if (this.atEnd || !this.currentValue) {
      this.seek(this.rangeStart.getTime());
    }
    this.isPlaying = true;
    this.playTimer = setInterval(() => {
      const next = this.currentValue.getTime() + PLAYBACK_TICK_MS * this.speed;
      this.seek(next);
      if (this.atEnd) {
        this.pause();
      }
    }, PLAYBACK_TICK_MS);
  }

  cycleSpeed(): void {
    const i = PLAYBACK_SPEEDS.indexOf(this.speed);
    this.speed = PLAYBACK_SPEEDS[(i + 1) % PLAYBACK_SPEEDS.length];
  }

  pause(): void {
    this.isPlaying = false;
    clearInterval(this.playTimer);
    this.playTimer = undefined;
  }

  // --- Helpers -------------------------------------------------------------

  private seek(ms: number | undefined): void {
    if (ms === undefined || isNaN(ms) || !this.rangeStart || !this.rangeEnd) { return; }
    const clamped = Math.min(this.rangeEnd.getTime(), Math.max(this.rangeStart.getTime(), ms));
    this.currentValue = new Date(clamped);
    this.scrub.emit(this.currentValue);
  }

  private fractionFromClientX(clientX: number): number {
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    return Math.min(1, Math.max(0, fraction));
  }

  private timeAtFraction(fraction: number): Date {
    return new Date(this.rangeStart.getTime() + fraction * this.spanMs);
  }

  private updateFromClientX(clientX: number): void {
    const t = this.timeAtFraction(this.fractionFromClientX(clientX));
    this.currentValue = t;
    this.scrub.emit(t);
  }
}
