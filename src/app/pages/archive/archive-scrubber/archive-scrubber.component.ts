import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

interface ITick {
  pct: number;
  label: string;
}

/**
 * Presentational DVR-style timeline scrubber: a horizontal track spanning
 * [rangeStart, rangeEnd] with a draggable/clickable playhead. Emits the
 * scrubbed-to time on every move; owns no data-fetching of its own so it
 * stays trivially reusable/testable - the parent (ArchiveDashboardComponent)
 * decides how to debounce `scrub` events into backend calls.
 */
@Component({
  selector: 'app-archive-scrubber',
  templateUrl: './archive-scrubber.component.html',
  styleUrls: ['./archive-scrubber.component.scss']
})
export class ArchiveScrubberComponent implements OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value && !this.isDragging) {
      this.currentValue = this.value;
    }
    if (changes.rangeStart || changes.rangeEnd) {
      this.rebuildTicks();
    }
  }

  get playheadPct(): number {
    return this.fractionFor(this.currentValue) * 100;
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

  private fractionFor(d: Date): number {
    if (!d) { return 0; }
    return this.fractionForTime(d.getTime());
  }

  private fractionForTime(ms: number): number {
    if (!this.rangeStart || !this.rangeEnd) { return 0; }
    const span = this.rangeEnd.getTime() - this.rangeStart.getTime();
    if (span <= 0) { return 0; }
    return Math.min(1, Math.max(0, (ms - this.rangeStart.getTime()) / span));
  }

  private rebuildTicks(): void {
    if (!this.rangeStart || !this.rangeEnd) {
      this.ticks = [];
      return;
    }
    const count = 6;
    const span = this.rangeEnd.getTime() - this.rangeStart.getTime();
    const ticks: ITick[] = [];
    for (let i = 0; i <= count; i++) {
      const pct = (i / count) * 100;
      const t = new Date(this.rangeStart.getTime() + (i / count) * span);
      ticks.push({ pct, label: this.formatTick(t) });
    }
    this.ticks = ticks;
  }

  private formatTick(d: Date): string {
    const span = this.rangeEnd.getTime() - this.rangeStart.getTime();
    const DAY = 24 * 60 * 60 * 1000;
    if (span <= DAY) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (span <= 31 * DAY) {
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }

  onTrackPointerDown(ev: PointerEvent): void {
    if (this.disabled || !this.rangeStart || !this.rangeEnd) { return; }
    this.isDragging = true;
    try {
      this.trackRef.nativeElement.setPointerCapture(ev.pointerId);
    } catch { /* pointer capture is best-effort */ }
    this.updateFromClientX(ev.clientX);
  }

  onTrackPointerMove(ev: PointerEvent): void {
    if (!this.isDragging) { return; }
    this.updateFromClientX(ev.clientX);
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
    const span = this.rangeEnd.getTime() - this.rangeStart.getTime();
    const smallStep = Math.max(1000, span / 200);
    const bigStep = Math.max(smallStep, span / 20);
    let next: number | null = null;
    switch (ev.key) {
      case 'ArrowLeft': next = this.currentValue.getTime() - smallStep; break;
      case 'ArrowRight': next = this.currentValue.getTime() + smallStep; break;
      case 'PageDown': next = this.currentValue.getTime() - bigStep; break;
      case 'PageUp': next = this.currentValue.getTime() + bigStep; break;
      case 'Home': next = this.rangeStart.getTime(); break;
      case 'End': next = this.rangeEnd.getTime(); break;
      default: return;
    }
    ev.preventDefault();
    const clamped = Math.min(this.rangeEnd.getTime(), Math.max(this.rangeStart.getTime(), next));
    this.currentValue = new Date(clamped);
    this.scrub.emit(this.currentValue);
  }

  private updateFromClientX(clientX: number): void {
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    let fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    fraction = Math.min(1, Math.max(0, fraction));
    const t = new Date(this.rangeStart.getTime() + fraction * (this.rangeEnd.getTime() - this.rangeStart.getTime()));
    this.currentValue = t;
    this.scrub.emit(t);
  }
}
