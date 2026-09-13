import { CreateDashboardItemDTO } from "./create-dashboard-item.dto";

// Used on update
export class updateDashboardDTO {
    items?: CreateDashboardItemDTO[];
    name?: string;
    description?: string;

    constructor(items?: CreateDashboardItemDTO[], name?: string, description?: string) {
        this.items = items;
        this.name = name;
        this.description = description;
    }
}