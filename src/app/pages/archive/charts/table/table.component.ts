import { Component, Input, OnChanges } from '@angular/core';
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

  ngOnChanges(): void {
    this.dataSource.data = (this.frames ?? []).map((item: IFrame) => ({
      time: new Date(item.time).toLocaleTimeString(),
      value: item.value
    }));
  }
}
