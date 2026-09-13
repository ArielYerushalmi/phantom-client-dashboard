import { ChartType } from "../../enums/chartType.enum";
import { IChartGridsterItem } from "../../interfaces/gridster/chart-gridster-item.interface";

// Used on create
export class CreateDashboardItemDTO {
    parameter: string;
    rows: number;
    cols: number;
    x: number;
    y: number;
    chartType: ChartType;

    constructor(item: IChartGridsterItem) {
        this.parameter = item.chart.parameter.id;
        this.rows = item.rows;
        this.cols = item.cols;
        this.x = item.x;
        this.y = item.y;
        this.chartType = item.chart.chartType;
    };
}