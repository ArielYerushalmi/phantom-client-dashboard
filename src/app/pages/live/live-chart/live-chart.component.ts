import { Component, Input } from '@angular/core';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';

@Component({
  selector: 'app-live-chart',
  templateUrl: './live-chart.component.html',
  styleUrls: ['./live-chart.component.css']
})
export class LiveChartComponent {
  @Input() entity: IChartEntity;

  constructor() { }

  ngOnInit() {
  }
}
