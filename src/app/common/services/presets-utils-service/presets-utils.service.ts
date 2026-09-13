import { EventEmitter, Injectable } from '@angular/core';
import { IChartGridsterItem } from '../../../common/interfaces/gridster/chart-gridster-item.interface';
import { ParameterRO } from '../../../common/dtos/parameter/parameter.ro';
import { ChartType } from '../../enums/chartType.enum';
import { IChartEntity } from '../../interfaces/gridster/entity.interface';
import { LiveData } from '../../interfaces/gridster/live-data.interface';
import { DashboardRO } from '../../dtos/dashboard/dashboard.ro';
import { createDashboardDTO } from '../../dtos/dashboard/create-dashboard.dto';
import { CreateDashboardItemDTO } from '../../dtos/dashboard/create-dashboard-item.dto';
import { IArchiveSettings } from '../../interfaces/archive/telemetry-archive-settings';
import { IFrame } from '../../interfaces/archive/archive-frame';
import { updateDashboardDTO } from '../../dtos/dashboard/update-dashboard.dto';

@Injectable({
  providedIn: 'root'
})
export class PresetsUtilsService {

  constructor() { }

  isParameterExists(parameterToFind: ParameterRO, parametersList: IChartGridsterItem[]): boolean {
    return parametersList.some((chartEntity: IChartGridsterItem) => chartEntity.chart.parameter.id === parameterToFind.id);
  }

  findItem(gridsterList: IChartGridsterItem[], parameter: ParameterRO): number {
    return gridsterList.findIndex((chartEntity: IChartGridsterItem) => chartEntity.chart.parameter.id === parameter.id);
  }

  findItemByName(gridsterList: IChartGridsterItem[], parameterName: string): number {
    return gridsterList.findIndex((chartEntity: IChartGridsterItem) => chartEntity.chart.parameter.parameterName === parameterName);
  }

  initGridsterItem(parameter: ParameterRO, chartType: ChartType): IChartEntity {
    let dataEvent = new EventEmitter<any>();
    let chartEntity: IChartEntity = {
      parameter,
      chartType,
      dataEvent
    };
    return chartEntity;
  }

  structureDataToType(value: number, type: ChartType, time?: Date): any {
    switch (type) {
      case ChartType.GAUGE:
      case ChartType.LABEL:
      case ChartType.STATUS:
        return value;

      case ChartType.PIE:
      case ChartType.ALERT:
      case ChartType.GRAPH:
      case ChartType.TABLE:
        let newTime = time ? time : new Date()
        let data: LiveData = { value, time: newTime };
        return data

      default:
        return null;
    }
  }

  setDashboard(presetName: string, IsLive: boolean): createDashboardDTO {
    let dashboardItems: CreateDashboardItemDTO[] = [];
    let name: string = presetName;
    let description: string = presetName + " description";
    let isLive: boolean = IsLive;
    let preset = new createDashboardDTO(dashboardItems, name, description, isLive)
    return preset
  }

  setDashboardItems(gridsterItemsList: IChartGridsterItem[]): CreateDashboardItemDTO[] {
    let dashboardItems: CreateDashboardItemDTO[] = [];
    gridsterItemsList.map(item => {
      let dashboardItem: CreateDashboardItemDTO = new CreateDashboardItemDTO(item)
      dashboardItems.push(dashboardItem)
    })
    return dashboardItems;
  }

  updateDashboardItems(dashboard?: DashboardRO, gridsterItemsList?: IChartGridsterItem[]): updateDashboardDTO {
    let name: string = dashboard.name;
    let description: string = dashboard.description;
    let items: CreateDashboardItemDTO[] = this.setDashboardItems(gridsterItemsList);
    let updateDashboard = new updateDashboardDTO(items, name, description);
    return updateDashboard;
  }

}
