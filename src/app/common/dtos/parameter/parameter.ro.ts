import { ChartType } from "../../enums/chartType.enum";
import { IParameter } from "../../interfaces/parameter/parameter.interface";

export class ParameterRO implements IParameter {
    readonly id: string;
    readonly parameterName: string;
    description: string;
    minimum: number;
    maximum: number;
    units: string;
    chartTypes: ChartType[];

    constructor(parameter: IParameter) {
        this.id = (<any>parameter)._id
        this.parameterName = parameter.parameterName;
        this.description = parameter.description;
        this.minimum = parameter.minimum;
        this.maximum = parameter.maximum;
        this.units = parameter.units;
        this.chartTypes = parameter.chartTypes;
    };
}