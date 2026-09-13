import { Component, OnInit, Input } from '@angular/core';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { LiveData } from 'src/app/common/interfaces/gridster/live-data.interface';

@Component({
  selector: 'app-live-graph',
  templateUrl: './live-graph.component.html',
  styleUrls: ['./live-graph.component.scss']
})
export class ChartsTryComponent implements OnInit {
  @Input() entity: IChartEntity;

  graphValues: any[] = [];
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = true;
  showLegend: boolean = false;
  showXAxisLabel: boolean = false;
  showYAxisLabel: boolean = true;
  colorScheme = {
    domain: ['#5950e8']
  }


  constructor() { }

  ngOnInit() {
    this.graphValues = [
      {
        name: this.entity.parameter.parameterName,
        series: []
      }
    ]

    this.entity.dataEvent.subscribe((value: LiveData) => {
      if (value) {
        this.apllyChart(value);
      }
    })
  }


  apllyChart(value: LiveData) {
    if (this.graphValues[0].series.length >= 10) {
      this.graphValues[0].series.splice(0, 1);
    }

    this.graphValues[0].series.push({ value: value.value, name: value.time });
    this.graphValues = [...this.graphValues];
  }

  public formatTime(date: Date): string {
    return date.toLocaleTimeString();
  }

}