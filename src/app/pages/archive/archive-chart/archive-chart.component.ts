import { Component, Input, OnInit } from '@angular/core';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';

@Component({
  selector: 'app-archive-chart',
  templateUrl: './archive-chart.component.html',
  styleUrls: ['./archive-chart.component.scss']
})
export class ArchiveChartComponent implements OnInit {
  @Input() entity: IChartEntity;
  
  constructor() { }

  ngOnInit(): void {
  }

}
