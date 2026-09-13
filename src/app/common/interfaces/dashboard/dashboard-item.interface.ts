import { ChartType } from "../../enums/chartType.enum";
import { IParameter } from "../parameter/parameter.interface";

export interface IDashboardItem {
    parameter: IParameter;
    rows: number;
    cols: number;
    x: number;
    y: number;
    chartType: ChartType;
}