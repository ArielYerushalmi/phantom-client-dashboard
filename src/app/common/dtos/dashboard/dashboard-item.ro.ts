import { ParameterRO } from '../parameter/parameter.ro';
import { IDashboardItem } from '../../interfaces/dashboard/dashboard-item.interface';
import { ChartType } from '../../enums/chartType.enum';

export class DashboardItemRO implements IDashboardItem {
    readonly id: string;
    readonly parameter: ParameterRO;
    rows: number;
    cols: number;
    x: number;
    y: number;
    chartType: ChartType;

    constructor(dashboardItem: IDashboardItem) {
        this.id = (dashboardItem as any)._id;
        this.parameter = new ParameterRO(dashboardItem.parameter);
        this.rows = dashboardItem.rows;
        this.cols = dashboardItem.cols;
        this.x = dashboardItem.x;
        this.y = dashboardItem.y;
        this.chartType = dashboardItem.chartType;
    };
}