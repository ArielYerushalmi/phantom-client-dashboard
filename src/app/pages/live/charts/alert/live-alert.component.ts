import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { LiveData } from 'src/app/common/interfaces/gridster/live-data.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-live-alert',
  templateUrl: './live-alert.component.html',
  styleUrls: ['./live-alert.component.scss']
})
export class LiveAlertComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;
  alerts: LiveData[] = [];
  private dataSubscription: Subscription;

  constructor() { }

  ngOnInit() {
    this.dataSubscription = this.entity.dataEvent.subscribe((value: LiveData) => {
      if (this.alerts[0]?.value != value.value) {
        if (this.alerts.length >= 3) {
          this.alerts.pop();
        }
        this.alerts.unshift(value);
      }
    })
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
