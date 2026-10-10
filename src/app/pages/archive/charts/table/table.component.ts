import { Component, Input, OnChanges, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnChanges {
  @Input() frames: IFrame[] = [];

  displayedColumns: string[] = ['time', 'value'];
  dataSource = new MatTableDataSource<{ time: string; value: number }>([]);

  /** A loaded range can hold thousands of samples; page through them instead of rendering all. */
  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    this.dataSource.paginator = paginator;
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
