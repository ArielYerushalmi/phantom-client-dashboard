import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { ArchiveService } from 'src/app/common/services/archive-service/archive.service';

export interface IArchiveRange {
  startTime: Date;
  endTime: Date;
  totalFrames: number;
}

interface IQuickPreset {
  label: string;
  hours: number;
}

/**
 * Compact range-setup step for the Archive scrubber. This used to be the
 * whole "filter form" page (pick start/end, browse saved dashboards, hit
 * Confirm) that the operator had to fill in before seeing any data. Now it
 * is just the coarse-range picker the scrubber needs to know what span of
 * time to scale itself against - it collapses to a one-line strip once a
 * range with data has been confirmed, and can be reopened to change it.
 *
 * The old "browse saved dashboards" panel that used to live here was a
 * Live-page concept (saved chart-grid layouts) that doesn't map onto
 * scrubbing through time, so it isn't reused here.
 */
@Component({
  selector: 'app-archive-filter',
  templateUrl: './archive-filter.component.html',
  styleUrls: ['./archive-filter.component.scss']
})
export class ArchiveFilterComponent implements OnDestroy {

  @Output() rangeConfirmed = new EventEmitter<IArchiveRange>();

  readonly quickPresets: IQuickPreset[] = [
    { label: 'Last 1 Hour', hours: 1 },
    { label: 'Last 6 Hours', hours: 6 },
    { label: 'Last 24 Hours', hours: 24 },
    { label: 'Last 7 Days', hours: 24 * 7 },
  ];

  expanded: boolean = true;
  inputStartTime: string = '';
  inputEndTime: string = '';
  isTimeValid: boolean = true;
  isLoading: boolean = false;
  loadError: boolean = false;
  noDataInRange: boolean = false;

  confirmedRange: IArchiveRange | null = null;

  private getLengthSubscription: Subscription;

  constructor(private readonly archiveService: ArchiveService) {
    this.applyPreset(this.quickPresets[2]);
  }

  ngOnDestroy(): void {
    this.getLengthSubscription?.unsubscribe();
  }

  applyPreset(preset: IQuickPreset): void {
    const end = new Date();
    const start = new Date(end.getTime() - preset.hours * 60 * 60 * 1000);
    this.inputStartTime = this.toDateTimeLocal(start);
    this.inputEndTime = this.toDateTimeLocal(end);
    this.onConfirm();
  }

  onConfirm(): void {
    const startTime = new Date(this.inputStartTime);
    const endTime = new Date(this.inputEndTime);

    if (!this.inputStartTime || !this.inputEndTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || startTime >= endTime) {
      this.isTimeValid = false;
      return;
    }
    this.isTimeValid = true;
    this.loadError = false;
    this.noDataInRange = false;
    this.isLoading = true;

    this.getLengthSubscription?.unsubscribe();
    this.getLengthSubscription = this.archiveService.getLength(startTime, endTime).subscribe(
      (totalFrames: number) => {
        this.isLoading = false;
        if (!totalFrames) {
          this.noDataInRange = true;
          return;
        }
        this.confirmedRange = { startTime, endTime, totalFrames };
        this.expanded = false;
        this.rangeConfirmed.emit(this.confirmedRange);
      },
      (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.loadError = true;
        console.log(error.error?.message ?? 'archive service is down!');
      }
    );
  }

  onChangeRange(): void {
    this.expanded = true;
  }

  private toDateTimeLocal(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
