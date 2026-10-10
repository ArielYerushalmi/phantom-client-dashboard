import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { ArchiveService } from 'src/app/common/services/archive-service/archive.service';

export interface IArchiveRange {
  startTime: Date;
  endTime: Date;
  totalFrames: number;
}

interface IQuickRange {
  label: string;
  minutes: number;
}

/** What the archive holds for the range currently typed into the fields. */
type PreviewState = 'checking' | 'ready' | 'empty' | 'invalid' | 'error';

/**
 * Archive query bar: choose a start and end time, see how much recorded data
 * that range holds, then load it. Quick ranges fill the fields and load in
 * one click. Emits the range to load; fetching the parameter data is the
 * dashboard's job.
 */
@Component({
  selector: 'app-archive-filter',
  templateUrl: './archive-filter.component.html',
  styleUrls: ['./archive-filter.component.scss']
})
export class ArchiveFilterComponent implements OnInit, OnDestroy {

  @Output() load = new EventEmitter<IArchiveRange>();

  readonly quickRanges: IQuickRange[] = [
    { label: 'Last 15 min', minutes: 15 },
    { label: 'Last hour', minutes: 60 },
    { label: 'Last 6 h', minutes: 6 * 60 },
    { label: 'Last 24 h', minutes: 24 * 60 },
  ];

  inputStartTime = '';
  inputEndTime = '';

  previewState: PreviewState = 'checking';
  previewFrames = 0;

  /** null = the fields don't form a valid range; it also cancels any count still in flight. */
  private readonly rangeChanges = new Subject<{ start: Date; end: Date; loadWhenReady: boolean } | null>();
  private previewSubscription: Subscription;

  constructor(private readonly archiveService: ArchiveService) { }

  ngOnInit(): void {
    this.previewSubscription = this.rangeChanges.pipe(
      debounceTime(300),
      switchMap((request) => {
        if (!request) {
          return of(null);
        }
        const { start, end, loadWhenReady } = request;
        this.previewState = 'checking';
        return this.archiveService.getLength(start, end).pipe(
          map((frames: number) => ({ frames, start, end, loadWhenReady, failed: false })),
          catchError((error: HttpErrorResponse) => {
            console.log(error.error?.message ?? 'archive service is down!');
            return of({ frames: 0, start, end, loadWhenReady, failed: true });
          })
        );
      })
    ).subscribe((result) => {
      if (!result) {
        this.previewState = 'invalid';
        return;
      }
      const { frames, start, end, loadWhenReady, failed } = result;
      this.previewFrames = frames;
      this.previewState = failed ? 'error' : frames > 0 ? 'ready' : 'empty';
      if (loadWhenReady && this.previewState === 'ready') {
        this.load.emit({ startTime: start, endTime: end, totalFrames: frames });
      }
    });

    // Start with the last hour loaded, so an opened preset shows data right away.
    this.fillRange(60);
    this.checkRange(true);
  }

  ngOnDestroy(): void {
    this.previewSubscription?.unsubscribe();
  }

  get canLoad(): boolean {
    return this.previewState === 'ready';
  }

  /** Quick ranges are a single action: fill the fields and load. */
  applyQuickRange(range: IQuickRange): void {
    this.fillRange(range.minutes);
    this.checkRange(true);
  }

  onFieldsChanged(): void {
    this.checkRange(false);
  }

  onLoad(): void {
    const range = this.parsedRange();
    if (range && this.canLoad) {
      this.load.emit({ startTime: range.start, endTime: range.end, totalFrames: this.previewFrames });
    }
  }

  private checkRange(loadWhenReady: boolean): void {
    const range = this.parsedRange();
    if (!range) {
      this.previewState = 'invalid';
      this.rangeChanges.next(null);
      return;
    }
    // Not loadable until this range's own count comes back.
    this.previewState = 'checking';
    this.rangeChanges.next({ ...range, loadWhenReady });
  }

  private parsedRange(): { start: Date; end: Date } | null {
    const start = new Date(this.inputStartTime);
    const end = new Date(this.inputEndTime);
    if (!this.inputStartTime || !this.inputEndTime || isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return null;
    }
    return { start, end };
  }

  private fillRange(minutes: number): void {
    const end = new Date();
    end.setMilliseconds(0);
    const start = new Date(end.getTime() - minutes * 60 * 1000);
    this.inputStartTime = this.toDateTimeLocal(start);
    this.inputEndTime = this.toDateTimeLocal(end);
  }

  private toDateTimeLocal(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
