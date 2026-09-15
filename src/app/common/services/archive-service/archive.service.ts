import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IArchiveSettings } from '../../interfaces/archive/telemetry-archive-settings';

// Rewritten for the timeline-scrubber Archive page (phase 3): the old version
// pushed responses through a pair of global EventEmitters and every caller
// filtered by parameter name to figure out which request a message belonged
// to. That made it impossible to safely cancel a stale in-flight request when
// the operator kept dragging the playhead. Returning plain Observables lets
// callers compose with switchMap/debounceTime themselves and get correct
// cancellation for free. Endpoints/params are unchanged.
@Injectable({
  providedIn: 'root'
})
export class ArchiveService {

  private readonly archiveGetTimeUrl: string = 'http://127.0.0.1:7789/Archive/GetTime';
  private readonly archiveGetLengthUrl: string = 'http://127.0.0.1:7789/Archive/GetLength';

  constructor(private httpClient: HttpClient) { }

  /**
   * Fetches up to `numberOfFrames` decoded frames for a single parameter
   * within [startTime, endTime], skipping the first `skipFrames` matches.
   */
  getFrames(parameter: string, numberOfFrames: number, skipFrames: number, startTime: Date, endTime: Date): Observable<IArchiveSettings> {
    return this.httpClient.get<IArchiveSettings>(
      `${this.archiveGetTimeUrl}?parameter=${encodeURIComponent(parameter)}&numberOfFrames=${numberOfFrames}&skipFrames=${skipFrames}&startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`
    );
  }

  /**
   * Total frame count (across all parameters, per the backend implementation)
   * within [startTime, endTime]. Used to validate a chosen coarse range
   * before handing it to the scrubber.
   */
  getLength(startTime: Date, endTime: Date): Observable<number> {
    return this.httpClient.get<number>(
      `${this.archiveGetLengthUrl}?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`
    );
  }
}
