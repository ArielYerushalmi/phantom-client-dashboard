import { FrameParameter } from "./frame-parameter";

export class FrameData {
    readonly Time: Date;
    readonly Parameters: FrameParameter[];
    
    constructor(time: Date, parameters: FrameParameter[]) {
        this.Parameters = parameters;
        this.Time = time;
    }
}