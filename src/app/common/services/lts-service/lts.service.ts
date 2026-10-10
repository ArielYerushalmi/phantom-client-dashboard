import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * idle         - no live session requested
 * connecting   - first socket attempt in flight
 * live         - socket open, frames flowing
 * reconnecting - socket dropped, automatic retry scheduled/in flight
 * lost         - automatic retries exhausted; needs a manual retry()
 */
export type LiveLinkPhase = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'lost';

export interface LiveLinkState {
  phase: LiveLinkPhase;
  attempt: number;
  maxAttempts: number;
  /** Delay before the next automatic attempt, for countdown UI. */
  retryInMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class LtsService {
  _subscription: EventEmitter<any>;

  /**
   * Emits whenever the websocket connection state changes, so consumers (e.g. the
   * live dashboard) can surface a "disconnected"/"reconnecting" indicator instead of
   * silently dropping live data.
   */
  connectionState: EventEmitter<boolean> = new EventEmitter<boolean>();

  /** Richer view of the same connection for reconnect/progress indicators. */
  readonly linkState = new BehaviorSubject<LiveLinkState>({ phase: 'idle', attempt: 0, maxAttempts: 5, retryInMs: 3000 });

  private readonly ltsUrl: string = 'http://127.0.0.1:5000/User';
  private readonly ltsWebSocket: string = "ws://127.0.0.1:5555";
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelayMs = 3000;

  _websocket: WebSocket;
  _isOpened = false;

  private manualClose = false;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: any;

  constructor(private httpClient: HttpClient) {
  }

  subscribe(req) {
    this.httpSubscribe(req);

    if (this._websocket == null || !this._isOpened) {
      this.initWebsocket();
    }

  }

  initWebsocket() {
    console.log("websocket open");
    this.manualClose = false;
    this.clearReconnectTimer();
    this._websocket = new WebSocket(this.ltsWebSocket);
    this.setLink(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    this._websocket.onopen = () => {
      this._isOpened = true;
      this.reconnectAttempts = 0;
      this.setLink('live');
      this.connectionState.emit(true);
    }

    this._websocket.onmessage = (event) => {
      if (this._subscription) {
        this._subscription.emit(event);
      }
    }

    this._websocket.onclose = (event) => {
      this._isOpened = false;
      console.log("Websocket Closed");
      this.connectionState.emit(false);
      this.scheduleReconnect();
      if (this.manualClose) {
        this.setLink('idle');
      } else if (!this.reconnectTimeoutId) {
        this.setLink('lost');
      }
    }

    this._websocket.onerror = (err) => {
      console.log(err);
    }
  }

  /** Operator-initiated reconnect after automatic retries gave up. */
  retry() {
    this.reconnectAttempts = 0;
    this.initWebsocket();
  }

  clearSubscription() {
    this.httpUnsubscribe();
  }

  unsubscribe() {
    // Closing the socket is enough: LTS tears down its pipeline consumer when the
    // client disconnects and re-arms it on the next connection. Calling /Stop here
    // stopped LTS's HttpListener, and once restarted it never accepts another
    // socket - so live data only worked on the first visit after LTS started.
    this.httpUnsubscribe();
    this._subscription = null;
  }

  start() {
    this._subscription = new EventEmitter<any>();
    this.httpClient.put(`${this.ltsUrl}/Start`, {}).subscribe(
      data => console.log(data),
      (error: HttpErrorResponse) => {
        if (error.error?.message != undefined) {
          console.log(error.error.message);
        } else {
          console.log("LTS service is down!");
        }
      });
  }

  stop() {
    return (this.httpClient.put(`${this.ltsUrl}/Stop`, {}).subscribe(
      data => console.log(data),
      (error: HttpErrorResponse) => {
        if (error.error?.message != undefined) {
          console.log(error.error.message);
        } else {
          console.log("LTS service is down!");
        }
      }));
  }

  private httpSubscribe(req) {
    return (this.httpClient.put(`${this.ltsUrl}/Subscribe`, req).subscribe(
      data => console.log(data),
      (error: HttpErrorResponse) => {
        if (error.error?.message != undefined) {
          console.log(error.error.message);
        } else {
          console.log("LTS service is down!");
        }
      }));
  }

  private httpUnsubscribe() {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    if (this._websocket !== undefined && this._websocket !== null)
      this._websocket.close();
  }

  /**
   * If the socket drops unexpectedly (backend restart, network blip, etc.) rather than
   * because the caller explicitly unsubscribed, try to re-establish it a few times so
   * live data resumes on its own instead of leaving the dashboard silently stalled.
   */
  private scheduleReconnect() {
    if (this.manualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    this.reconnectAttempts++;
    this.clearReconnectTimer();
    this.setLink('reconnecting');
    this.reconnectTimeoutId = setTimeout(() => {
      if (!this.manualClose) {
        this.initWebsocket();
      }
    }, this.reconnectDelayMs);
  }

  private setLink(phase: LiveLinkPhase) {
    this.linkState.next({
      phase,
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      retryInMs: this.reconnectDelayMs
    });
  }

  private clearReconnectTimer() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
  }
}
