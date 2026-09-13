import { Component, Input, OnInit } from '@angular/core';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit {
  @Input() entity: IChartEntity;

  graphValues: any[] = [];
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = true;
  showLegend: boolean = false;
  showXAxisLabel: boolean = false;
  showYAxisLabel: boolean = false;
  colorScheme = {
    domain: ['#5950e8']
  }

  constructor() { }

  ngOnInit(): void {
    console.log("in graph no value");

    this.graphValues = [
      {
        name: this.entity.parameter.parameterName,
        series: []
      }
    ]

    this.entity.dataEvent.subscribe((value: IFrame[]) => {
      console.log("in graph", value);

      if (value) {
        this.graphValues[0].series.splice(0);
        this.apllyChart(value);
      }
    })

    setTimeout(() => {
      const resizeObserver = new ResizeObserver((entries) => {
        this.graphValues = [...this.graphValues];
      })
      resizeObserver.observe(document.getElementById(this.entity.parameter.parameterName))
    }, 20);
  }

  apllyChart(arrayOfFrames: IFrame[]) {
    arrayOfFrames.forEach((item: IFrame) => {
      this.graphValues[0].series.push({ value: item.value, name: item.time });
    })
    this.graphValues = [...this.graphValues];
  }

  public formatTime(date: string): string {
    return new Date(date).toLocaleTimeString();
  }

}
