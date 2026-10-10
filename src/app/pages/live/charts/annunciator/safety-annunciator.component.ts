import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  SensorAlertService,
  SensorLinkState,
  SensorState
} from 'src/app/common/services/sensor-alert-service/sensor-alert.service';

/**
 * Cockpit-style annunciator panel for the sensors-service safety stream:
 * one lamp per sensor (crash, loss of control, engine, can-fire). A lamp is
 * lit, with its cause and duration, exactly while the sensor is active -
 * nothing for the operator to click or dismiss.
 */
@Component({
  selector: 'app-safety-annunciator',
  templateUrl: './safety-annunciator.component.html',
  styleUrls: ['./safety-annunciator.component.scss']
})
export class SafetyAnnunciatorComponent implements OnInit, OnDestroy {
  states: SensorState[] = [];
  link: SensorLinkState = 'offline';
  now = Date.now();

  private readonly subscriptions = new Subscription();
  private ticker: any;

  constructor(private readonly sensorAlerts: SensorAlertService) { }

  ngOnInit(): void {
    this.sensorAlerts.start();
    this.subscriptions.add(this.sensorAlerts.states$.subscribe((states) => this.states = states));
    this.subscriptions.add(this.sensorAlerts.link$.subscribe((link) => this.link = link));
    this.ticker = setInterval(() => this.now = Date.now(), 1000);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    clearInterval(this.ticker);
  }

  elapsed(state: SensorState): string {
    if (!state.since) {
      return '';
    }
    const total = Math.max(0, Math.floor((this.now - state.since.getTime()) / 1000));
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  trackByKind(_: number, state: SensorState): number {
    return state.kind;
  }
}
