import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;

  archiveList: any[] = [];
  displayedColumns: string[] = ['time', 'value'];
  dataSource = new MatTableDataSource<IFrame>(this.archiveList);
  private dataSubscription: Subscription;

  constructor() { }

  ngOnInit(): void {
    this.dataSubscription = this.entity.dataEvent.subscribe((data: IFrame[]) => {
      this.archiveList.splice(0);
      data.map((item: IFrame) => {
        let archiveData: any = { time: new Date(item.time).toLocaleTimeString(), value: item.value };
        this.archiveList.push(archiveData);
      });
      this.dataSource.data = this.archiveList;
    })
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
