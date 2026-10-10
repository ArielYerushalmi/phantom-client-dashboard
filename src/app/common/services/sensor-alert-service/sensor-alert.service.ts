import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Mirrors Sensors_Service.enums.SensorTypes.SensorType (sensors-service). */
export enum SensorKind {
  CanFire = 0,
  ChanceOfEngineError = 1,
  ChanceOfLostOfControl = 2,
  CrashWarning = 3
}

/**
 * warning  - red; immediate crew action.
 * caution  - amber, steady; awareness required.
 * advisory - green; a positive state (e.g. firing solution available).
 */
export type AnnunciatorSeverity = 'warning' | 'caution' | 'advisory';

export interface SensorDefinition {
  kind: SensorKind;
  code: string;
  label: string;
  detail: string;
  severity: AnnunciatorSeverity;
}

export interface SensorState extends SensorDefinition {
  active: boolean;
  /** When the current active period started; null while inactive. */
  since: Date | null;
}

export type SensorLinkState = 'connecting' | 'online' | 'offline';

export const SENSOR_DEFINITIONS: SensorDefinition[] = [
  { kind: SensorKind.CrashWarning, code: 'CRASH', label: 'Crash warning', detail: 'High speed at low altitude, no target lock', severity: 'warning' },
  { kind: SensorKind.ChanceOfLostOfControl, code: 'CTRL', label: 'Loss of control', detail: 'Flight envelope exceeded', severity: 'warning' },
  { kind: SensorKind.ChanceOfEngineError, code: 'ENG', label: 'Engine error risk', detail: 'Heat, wind, pressure and speed above limits', severity: 'caution' },
  { kind: SensorKind.CanFire, code: 'FIRE', label: 'Can fire', detail: 'Armed, target locked, inside release range', severity: 'advisory' }
];

/**
 * Client for the sensors-service safety stream. The service only sends a
 * message when a sensor's state flips, so this keeps the latest state per
 * sensor and exposes it as a stream for the command bar and Live page.
 */
@Injectable({
  providedIn: 'root'
})
export class SensorAlertService implements OnDestroy {
  private readonly url = 'ws://127.0.0.1:4444';
  private readonly maxBackoffMs = 15000;
  /**
   * Sensors can flap on/off every second. A clear only takes effect once the
   * sensor has stayed off this long, so a flapping alarm reads as one steady
   * lamp instead of flickering (and restarting its timer) every frame.
   */
  private readonly clearHoldMs = 3000;

  private readonly clearTimers = new Map<SensorKind, any>();

  private socket: WebSocket | null = null;
  private reconnectTimer: any;
  private backoffMs = 1500;
  private started = false;

  private readonly statesSubject = new BehaviorSubject<SensorState[]>(
    SENSOR_DEFINITIONS.map((def) => ({ ...def, active: false, since: null }))
  );
  private readonly linkSubject = new BehaviorSubject<SensorLinkState>('offline');

  readonly states$: Observable<SensorState[]> = this.statesSubject.asObservable();
  readonly link$: Observable<SensorLinkState> = this.linkSubject.asObservable();

  /** Whether any warning / caution is active - drives the master warning/caution lamps. */
  readonly master$: Observable<{ warning: boolean; caution: boolean }> = this.states$.pipe(
    map((states) => ({
      warning: states.some((s) => s.active && s.severity === 'warning'),
      caution: states.some((s) => s.active && s.severity === 'caution')
    }))
  );

  constructor(private readonly zone: NgZone) { }

  /** Idempotent - safe to call from every consumer. */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.connect();
  }

  ngOnDestroy(): void {
    this.started = false;
    clearTimeout(this.reconnectTimer);
    this.clearTimers.forEach((timer) => clearTimeout(timer));
    this.clearTimers.clear();
    this.socket?.close();
  }

  private connect(): void {
    this.linkSubject.next('connecting');
    try {
      this.socket = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => this.zone.run(() => {
      this.backoffMs = 1500;
      this.linkSubject.next('online');
    });

    this.socket.onmessage = (event: MessageEvent) => this.zone.run(() => this.handleMessage(event.data));

    this.socket.onclose = () => this.zone.run(() => {
      this.linkSubject.next('offline');
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (!this.started) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), this.backoffMs);
    this.backoffMs = Math.min(this.maxBackoffMs, this.backoffMs * 2);
  }

  private handleMessage(raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const kind = this.toKind(msg?.sensorType ?? msg?.SensorType);
    const active = Boolean(msg?.sensorState ?? msg?.SensorState);
    if (kind === null) {
      return;
    }

    const current = this.statesSubject.value.find((s) => s.kind === kind);

    if (active) {
      // Back on inside the hold window: the same alarm is still running.
      clearTimeout(this.clearTimers.get(kind));
      this.clearTimers.delete(kind);
      if (current.active) {
        return;
      }
      this.patch(kind, (s) => ({ ...s, active: true, since: new Date() }));
      return;
    }

    if (!current.active || this.clearTimers.has(kind)) {
      return;
    }
    this.clearTimers.set(kind, setTimeout(() => {
      this.clearTimers.delete(kind);
      this.patch(kind, (s) => ({ ...s, active: false, since: null }));
    }, this.clearHoldMs));
  }

  private patch(kind: SensorKind, update: (state: SensorState) => SensorState): void {
    this.statesSubject.next(this.statesSubject.value.map((s) => (s.kind === kind ? update(s) : s)));
  }

  /** Newtonsoft serialises enums as ints by default; accept names too in case a StringEnumConverter is added. */
  private toKind(value: unknown): SensorKind | null {
    if (typeof value === 'number' && SensorKind[value] !== undefined) {
      return value as SensorKind;
    }
    if (typeof value === 'string' && value in SensorKind) {
      return SensorKind[value as keyof typeof SensorKind];
    }
    return null;
  }
}
