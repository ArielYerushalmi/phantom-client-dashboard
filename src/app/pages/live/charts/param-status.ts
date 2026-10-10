import { ParameterRO } from 'src/app/common/dtos/parameter/parameter.ro';

/**
 * Shared reading of a live parameter, used by every tile and by the page's
 * summary line so both always agree on what is abnormal.
 *
 * Colour is reserved for conditions an operator must act on (high-performance
 * HMI practice): a value outside its defined range, a fault flag that is set,
 * or data that has stopped arriving. Everything else stays neutral.
 */
export type ParamStatus = 'waiting' | 'normal' | 'alarm' | 'stale';

/** No frame for this long while the link is up means the reading can't be trusted. */
export const STALE_AFTER_MS = 5000;

/** Discrete flags whose ON state is itself a fault. */
const FAULT_WHEN_ON = new Set(['IsEngineError']);

/** Readable names for the raw signal ids; anything not listed is derived from the id. */
const LABELS: { [name: string]: string } = {
  AirPreasure: 'Air pressure',
  AutomaticPilot: 'Autopilot',
  BombsAmount: 'Bombs remaining',
  DistanceFromTarget: 'Distance to target',
  Gforce: 'G-force',
  IsArmed: 'Armed',
  IsEngineError: 'Engine fault',
  IsLandingMode: 'Landing mode',
  IsSneakMode: 'Stealth mode',
  IsTargetDetected: 'Target detected',
  WindVelocity: 'Wind speed'
};

export function paramLabel(name: string): string {
  if (LABELS[name]) {
    return LABELS[name];
  }
  const words = name.replace(/^Is(?=[A-Z])/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** 0/1 parameters are states (ON/OFF), not quantities. */
export function isDiscrete(p: ParameterRO): boolean {
  return p.minimum === 0 && p.maximum === 1;
}

export function hasRange(p: ParameterRO): boolean {
  return p.minimum != null && p.maximum != null && p.maximum > p.minimum;
}

export function isFaultFlag(p: ParameterRO): boolean {
  return FAULT_WHEN_ON.has(p.parameterName);
}

export function isOutOfLimits(p: ParameterRO, value: number | null): boolean {
  if (value === null) {
    return false;
  }
  if (isDiscrete(p)) {
    return isFaultFlag(p) && value >= 1;
  }
  return hasRange(p) && (value < p.minimum || value > p.maximum);
}

export function paramStatus(p: ParameterRO, value: number | null, lastUpdate: number | null, now: number): ParamStatus {
  if (lastUpdate === null) {
    return 'waiting';
  }
  if (now - lastUpdate > STALE_AFTER_MS) {
    return 'stale';
  }
  return isOutOfLimits(p, value) ? 'alarm' : 'normal';
}

/** Position of a value on its [minimum, maximum] scale, clamped to 0-100. */
export function rangePct(p: ParameterRO, value: number | null): number {
  if (value === null || !hasRange(p)) {
    return 0;
  }
  return Math.min(100, Math.max(0, ((value - p.minimum) / (p.maximum - p.minimum)) * 100));
}
