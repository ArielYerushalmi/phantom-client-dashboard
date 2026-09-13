import { Component, Input, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {
  @Input() entity: IChartEntity;

  archiveList: any[] = [];
  displayedColumns: string[] = ['time', 'value'];
  dataSource = new MatTableDataSource<IFrame>(this.archiveList);

  constructor() { }

  ngOnInit(): void {
    this.entity.dataEvent.subscribe((data: IFrame[]) => {
      this.archiveList.splice(0);
      console.log("value got from entity: ", data);
      data.map((item: IFrame) => {
        let archiveData: any = { time: new Date(item.time).toLocaleTimeString(), value: item.value };
        this.archiveList.push(archiveData);
      });
      this.dataSource.data = this.archiveList;
    })
  }
}
