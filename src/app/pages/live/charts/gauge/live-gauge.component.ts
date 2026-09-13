import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-live-gauge',
  templateUrl: './live-gauge.component.html',
  styleUrls: ['./live-gauge.component.css']
})
export class LiveGaugeComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;

  gaugeType: string = "arch";
  gaugeStyle: string = "round";
  gaugeValue: number = 0;
  gaugeAppendText: string;
  thresholdConfig: any;
  size: number = 200;

  private dataSubscription: Subscription;
  private resizeObserver: ResizeObserver;

  constructor() { }

  ngOnInit() {
    this.setGaugeSettings();
    this.dataSubscription = this.entity.dataEvent.subscribe((value: number) => {
      if (value) {
        this.gaugeValue = value;
      }
    });

    setTimeout(() => {
      this.resizeObserver = new ResizeObserver((entries) => {
        // console.log('Resize');
        this.resizeGauge();
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
