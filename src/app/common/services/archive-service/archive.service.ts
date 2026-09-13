import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { IArchiveSettings } from '../../interfaces/archive/telemetry-archive-settings';

@Injectable({
  providedIn: 'root'
})
export class ArchiveService {
  _subscription: EventEmitter<IArchiveSettings> = new EventEmitter<IArchiveSettings>();
  _getLengthSubscription: EventEmitter<number> = new EventEmitter<number>();

  private readonly archiveGetTimeUrl: string = 'http://127.0.0.1:7789/Archive/GetTime';
  private readonly archiveGetLengthUrl: string = 'http://127.0.0.1:7789/Archive/GetLength';

  constructor(private httpClient: HttpClient) { }

  httpSubscribe(parameter: string, numberOfFrames: number, skipFrames: number, startTime: Date, endTime: Date) {
    return (this.httpClient
      .get<IArchiveSettings>(`${this.archiveGetTimeUrl}?parameter=${parameter}&numberOfFrames=${numberOfFrames}&skipFrames=${skipFrames}&startTime=${startTime}&endTime=${endTime}`)
      .subscribe(
        data => this._subscription.emit(data),
        (error: HttpErrorResponse) => {
          if (error.error.message != undefined) {
            console.log(error.error.message);
          } else {
            console.log("archive service is down!");
          }
        }));
  }

  httpGetLength(startTime: Date, endTime: Date) {
    return (this.httpClient
      .get<number>(`${this.archiveGetLengthUrl}?startTime=${startTime}&endTime=${endTime}`)
      .subscribe(
        data => this._getLengthSubscription.emit(data),
        (error: HttpErrorResponse) => {
          if (error.error.message != undefined) {
            console.log(error.error.message);
          } else {
            console.log("archive service is down!");
          }
        }));
  }
}
