import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IChartEntity } from '../../.././../common/interfaces/gridster/entity.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-live-label',
  templateUrl: './live-label.component.html',
  styleUrls: ['./live-label.component.scss']
})
export class LiveLabelComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;
  data: number;
  private dataSubscription: Subscription;

  constructor() { }

  ngOnInit() {
    this.dataSubscription = this.entity.dataEvent.subscribe((value: number) => {
      this.data = value
    })
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
