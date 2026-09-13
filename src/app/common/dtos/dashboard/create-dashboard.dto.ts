import { CreateDashboardItemDTO } from "./create-dashboard-item.dto";

// Used on create
export class createDashboardDTO {
    items: CreateDashboardItemDTO[];
    name: string;
    description: string;
    isLive: boolean;

    constructor(items: CreateDashboardItemDTO[], name: string, description: string, isLive: boolean) {
        this.items = items;
        this.name = name;
        this.description = description;
        this.isLive = isLive;
    };
}