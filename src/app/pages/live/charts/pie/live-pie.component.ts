import { Component, Input, OnInit } from '@angular/core';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { LiveData } from 'src/app/common/interfaces/gridster/live-data.interface';
import { PieData } from 'src/app/common/interfaces/gridster/pie-data.interface';

@Component({
  selector: 'app-live-pie',
  templateUrl: './live-pie.component.html',
  styleUrls: ['./live-pie.component.css']
})
export class LivePieComponent implements OnInit {
  @Input() entity: IChartEntity;
  pieChartData: PieData[] = [];

  showLegend: boolean = true;
  isDoughnut: boolean = false;
  legendTitle: string = '';
  // legendPosition: string = '';

  // gradient: boolean = true;
  showLabels: boolean = true;

  constructor() { }

  ngOnInit(): void {
    this.entity.dataEvent.subscribe((value: LiveData) => {
      this.incrementNumberCount(value.value);
    })
  }

  incrementNumberCount(value: number): void {
    const existingNumberCount = this.pieChartData.find((data) => data.name === value.toString());
    if (existingNumberCount) {
      existingNumberCount.value++;
    } else {
      this.pieChartData.push({ name: value.toString(), value: 1 });
    }
    this.pieChartData = this.pieChartData.map(obj => {
      return {
        name: obj.name,
        value: obj.value
      };
    });
  }

  onSelect(): void {
    this.isDoughnut = !this.isDoughnut
  }
}
