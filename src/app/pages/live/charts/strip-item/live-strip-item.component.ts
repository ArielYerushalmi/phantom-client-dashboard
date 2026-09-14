import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { IChartEntity } from 'src/app/common/interfaces/gridster/entity.interface';
import { LiveData } from 'src/app/common/interfaces/gridster/live-data.interface';

const SPARKLINE_MAX_POINTS = 20;
const SPARKLINE_WIDTH = 100;
const SPARKLINE_HEIGHT = 28;

/**
 * One compact "at-a-glance" instrument in the Live page's secondary strip: a numeric
 * value plus a tiny hand-rolled sparkline (no axes/legend - ngx-charts' line chart
 * needs real estate for those that a strip item doesn't have). Clicking anywhere on
 * the item (other than the remove button) promotes it into the large focus panel.
 */
@Component({
  selector: 'app-live-strip-item',
  templateUrl: './live-strip-item.component.html',
  styleUrls: ['./live-strip-item.component.scss']
})
export class LiveStripItemComponent implements OnInit, OnDestroy {
  @Input() entity: IChartEntity;
  @Output() focus = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  value: number | null = null;

  private history: number[] = [];
  private dataSubscription: Subscription;

  ngOnInit() {
    this.dataSubscription = this.entity.dataEvent.subscribe((data: LiveData) => {
      if (data) {
        this.value = data.value;
        this.pushHistory(data.value);
      }
    });
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }

  private pushHistory(value: number): void {
    this.history.push(value);
    if (this.history.length > SPARKLINE_MAX_POINTS) {
      this.history.shift();
    }
  }

  get sparklinePoints(): string {
    if (this.history.length < 2) {
      return '';
    }
    const min = Math.min(...this.history);
    const max = Math.max(...this.history);
    const range = (max - min) || 1;
    const step = SPARKLINE_WIDTH / (this.history.length - 1);
    return this.history
      .map((v, i) => {
        const x = i * step;
        const y = SPARKLINE_HEIGHT - ((v - min) / range) * SPARKLINE_HEIGHT;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  onActivate(): void {
    this.focus.emit();
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
