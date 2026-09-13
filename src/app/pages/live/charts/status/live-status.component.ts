import { Component, Input } from '@angular/core';
import { IChartEntity } from '../../../../common/interfaces/gridster/entity.interface';

@Component({
  selector: 'app-live-status',
  templateUrl: './live-status.component.html',
  styleUrls: ['./live-status.component.scss']
})
export class LiveStatusComponent {
  @Input() entity: IChartEntity;
  status: boolean;

  constructor() { }

  ngOnInit() {
    this.entity.dataEvent.subscribe((value: number) => {
      this.onStatusData(value);
    })
  }

  onStatusData(dataEventValue: number) {
    if (dataEventValue == 0) {
      this.status = false
    } else {
      this.status = true
    }
  }
}
