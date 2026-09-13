import { DashboardItemRO } from "./dashboard-item.ro";
import { IDashboard } from '../../interfaces/dashboard/dashboard.interface';

// EVERY TIME
// Used for responses DTO from server
export class DashboardRO implements IDashboard {
    readonly id: string;
    items: DashboardItemRO[];
    name: string;
    description: string;
    isLive: boolean;

    // NOT USED HERE
    constructor(dashboard: IDashboard) {
        this.id = (dashboard as any).id
        this.name = dashboard.name;
        this.description = dashboard.description;
        this.isLive = dashboard.isLive;
        this.items = [];
        dashboard.items.forEach((dashboardItem) => this.items.push(new DashboardItemRO(dashboardItem)))
    };
}