import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';

@Component({
  selector: 'app-live-gauge',
  templateUrl: './live-gauge.component.html',
  styleUrls: ['./live-gauge.component.css']
})
export class LiveGaugeComponent implements OnInit {
  @Input() entity: IChartEntity;

  gaugeType: string = "arch";
  gaugeStyle: string = "round";
  gaugeValue: number = 0;
  gaugeAppendText: string;
  thresholdConfig: any;
  size: number = 200;

  constructor() { }

  ngOnInit() {
    this.setGaugeSettings();
    this.entity.dataEvent.subscribe((value: number) => {
      if (value) {
        this.gaugeValue = value;
      }
    });

    setTimeout(() => {
      const resizeObserver = new ResizeObserver((entries) => {
        // console.log('Resize');
        this.resizeGauge();
      })
      resizeObserver.observe(document.getElementById(this.entity.parameter.parameterName))
    }, 20);
  }

  public resizeGauge(): void {
    let parent = document.getElementById(this.entity.parameter.parameterName)
    if (parent != null && parent != undefined) {
      let parentWidth: number = +parent.offsetWidth;
      let parentHeight: number = +parent.offsetHeight;
      this.size = parentHeight < parentWidth ? parentHeight : 0.95 * parentWidth;
    }
  }

  setGaugeSettings() {
    this.gaugeAppendText = this.entity.parameter.units;
    let range = this.entity.parameter.maximum - this.entity.parameter.minimum;
    this.thresholdConfig = {
      [this.entity.parameter.minimum]: { color: 'red' },
      [(0.1 * range) + this.entity.parameter.minimum]: { color: 'yellow' },
      [(0.25 * range) + this.entity.parameter.minimum]: { color: 'green' },
      [(0.75 * range) + this.entity.parameter.minimum]: { color: 'yellow' },
      [(0.9 * range) + this.entity.parameter.minimum]: { color: 'red' },
    }
  }
}
