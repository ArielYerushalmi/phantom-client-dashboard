import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { LiveData } from 'src/app/common/interfaces/gridster/live-data.interface';

/**
 * The dominant instrument on the Live page: one large numeric readout plus its live
 * graph, for whichever single parameter the operator has promoted into focus. Reuses
 * app-live-graph unmodified for the graph itself; this component only owns the big
 * number above it, fed off the same entity.dataEvent stream.
 */
@Component({
  selector: 'app-live-focus',
  templateUrl: './live-focus.component.html',
  styleUrls: ['./live-focus.component.scss']
})
export class LiveFocusComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;

  value: number | null = null;

  private dataSubscription: Subscription;

  ngOnInit() {
    this.dataSubscription = this.entity.dataEvent.subscribe((data: LiveData) => {
      if (data) {
        this.value = data.value;
      }
    });
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
