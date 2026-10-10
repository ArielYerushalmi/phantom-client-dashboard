import { Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';

/** Must match .mat-row / .mat-header-row heights in the stylesheet. */
const ROW_HEIGHT = 26;
const HEADER_HEIGHT = 28;

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnChanges, OnDestroy {
  @Input() frames: IFrame[] = [];

  displayedColumns: string[] = ['time', 'value'];
  dataSource = new MatTableDataSource<{ time: string; value: number }>([]);

  /** Rows per page: exactly as many as the panel has room for, so the table never scrolls. */
  pageSize = 10;

  private paginatorRef: MatPaginator;
  private resizeObserver: ResizeObserver;

  /** A loaded range can hold thousands of samples; page through them instead of rendering all. */
  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    this.paginatorRef = paginator;
    this.dataSource.paginator = paginator;
  }

  @ViewChild('rowsArea') set rowsArea(ref: ElementRef<HTMLElement> | undefined) {
    this.resizeObserver?.disconnect();
    if (!ref) {
      return;
    }
    this.resizeObserver = new ResizeObserver(([entry]) => this.zone.run(() => this.fitPageSize(entry.contentRect.height)));
    this.resizeObserver.observe(ref.nativeElement);
  }

  constructor(private readonly zone: NgZone) { }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private fitPageSize(height: number): void {
    const rows = Math.max(1, Math.floor((height - HEADER_HEIGHT) / ROW_HEIGHT));
    if (rows === this.pageSize || !this.paginatorRef) {
      return;
    }
    // Keep the first visible sample on screen when the page size changes.
    const firstRow = this.paginatorRef.pageIndex * this.paginatorRef.pageSize;
    this.pageSize = rows;
    this.paginatorRef.pageSize = rows;
    this.paginatorRef.pageIndex = Math.floor(firstRow / rows);
    this.dataSource.paginator = this.paginatorRef;
  }

  ngOnChanges(): void {
    const frames = this.frames ?? [];
    const first = frames.length ? new Date(frames[0].time) : null;
    const last = frames.length ? new Date(frames[frames.length - 1].time) : null;
    const spansDays = !!first && first.toDateString() !== last.toDateString();
    this.dataSource.data = frames.map((item: IFrame) => {
      const t = new Date(item.time);
      const time = t.toLocaleTimeString([], { hour12: false });
      return { time: spansDays ? `${t.getDate()}/${t.getMonth() + 1} ${time}` : time, value: item.value };
    });
  }
}
