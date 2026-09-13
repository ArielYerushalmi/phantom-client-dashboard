export class FrameParameter {
    readonly Name: string;
    readonly Data: number;
    
    constructor(name: string, data: number) {
        this.Data = data;
        this.Name = name;
    }
}