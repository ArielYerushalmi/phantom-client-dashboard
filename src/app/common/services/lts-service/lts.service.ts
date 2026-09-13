import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EventEmitter, Injectable, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LtsService {
  _subscription: EventEmitter<any>;

  private readonly ltsUrl: string = 'http://127.0.0.1:5000/User';
  private readonly ltsWebSocket: string = "ws://127.0.0.1:5555";
  _websocket: WebSocket;
  _isOpened = false;

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
    this._websocket = new WebSocket(this.ltsWebSocket);

    this._websocket.onopen = () => {
      this._isOpened = true;
    }

    this._websocket.onmessage = (event) => {
      this._subscription.emit(event);
    }

    this._websocket.onclose = (event) => {
      this._isOpened = false;
      console.log("Websocket Closed");
    }

    this._websocket.onerror = (err) => {
      console.log(err);
    }
  }

  clearSubscription() {
    this.httpUnsubscribe();
  }

  unsubscribe() {
    this.httpUnsubscribe();
    this._subscription = null;
  }

  start() {
    this._subscription = new EventEmitter<any>();
    this.httpClient.put(`${this.ltsUrl}/Start`, {}).subscribe(
      data => console.log(data),
      (error: HttpErrorResponse) => {
        if (error.error.message != undefined) {
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
        if (error.error.message != undefined) {
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
        if (error.error.message != undefined) {
          console.log(error.error.message);
        } else {
          console.log("LTS service is down!");
        }
      }));
  }

  private httpUnsubscribe() {
    if (this._websocket !== undefined && this._websocket !== null)
      this._websocket.close();
  }
}
