import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IChartEntity } from '../../../../common/interfaces/gridster/entity.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-live-status',
  templateUrl: './live-status.component.html',
  styleUrls: ['./live-status.component.scss']
})
export class LiveStatusComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;
  status: boolean;
  private dataSubscription: Subscription;

  constructor() { }

  ngOnInit() {
    this.dataSubscription = this.entity.dataEvent.subscribe((value: number) => {
      this.onStatusData(value);
    })
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }

  onStatusData(dataEventValue: number) {
    if (dataEventValue == 0) {
      this.status = false
    } else {
      this.status = true
    }
  }
}
