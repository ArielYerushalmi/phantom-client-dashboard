import { Component, Input } from '@angular/core';
import { IChartEntity } from '../../.././../common/interfaces/gridster/entity.interface';

@Component({
  selector: 'app-live-label',
  templateUrl: './live-label.component.html',
  styleUrls: ['./live-label.component.scss']
})
export class LiveLabelComponent {
  @Input() entity: IChartEntity;
  data: number;

  constructor() { }

  ngOnInit() {
    this.entity.dataEvent.subscribe((value: number) => {
      this.data = value
    })
  }
}
