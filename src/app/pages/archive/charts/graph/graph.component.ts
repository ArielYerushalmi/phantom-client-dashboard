import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;
  private dataSubscription: Subscription;
  private resizeObserver: ResizeObserver;

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
    this.graphValues = [
      {
        name: this.entity.parameter.parameterName,
        series: []
      }
    ]

    this.dataSubscription = this.entity.dataEvent.subscribe((value: IFrame[]) => {
      if (value) {
        this.graphValues[0].series.splice(0);
        this.apllyChart(value);
      }
    })

    setTimeout(() => {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.graphValues = [...this.graphValues];
      })
      const target = document.getElementById(this.entity.parameter.parameterName);
      if (target) {
        this.resizeObserver.observe(target);
      }
    }, 20);
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
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
