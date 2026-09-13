import { GridsterItem } from 'angular-gridster2'
import { IChartEntity } from './entity.interface'

export interface IChartGridsterItem extends GridsterItem {
    chart: IChartEntity
}