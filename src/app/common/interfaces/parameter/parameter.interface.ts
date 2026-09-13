import { ChartType } from '../../enums/chartType.enum';

export interface IParameter {
    parameterName: string;
    description: string;
    minimum: number;
    maximum: number;
    units: string;
    chartTypes: ChartType[];
}