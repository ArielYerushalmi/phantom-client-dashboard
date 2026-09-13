import { IDashboardItem } from "./dashboard-item.interface";

// Probably not used here
export interface IDashboard {
    items: IDashboardItem[];
    name: string;
    description: string;
    isLive: boolean;
}