import { Component, Input } from '@angular/core';
import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';
import { ChartType } from 'src/app/common/enums/chartType.enum';
import { IFrame } from 'src/app/common/interfaces/archive/archive-frame';

@Component({
  selector: 'app-archive-chart',
  templateUrl: './archive-chart.component.html',
  styleUrls: ['./archive-chart.component.scss']
})
export class ArchiveChartComponent {
  @Input() parameter: ParameterRO;
  @Input() frames: IFrame[] = [];
  @Input() chartType: ChartType = ChartType.GRAPH;

  readonly ChartType = ChartType;
}
