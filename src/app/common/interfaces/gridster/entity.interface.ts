import { EventEmitter } from "@angular/core";
import { ChartType } from "../../enums/chartType.enum";
import { ParameterRO } from "../../dtos/parameter/parameter.ro";

export interface IChartEntity {
    parameter: ParameterRO;
    dataEvent: EventEmitter<any>;
    chartType: ChartType;
}