/**
 * Shared limit logic for live readouts, using the same bands the gauge has
 * always drawn across a parameter's [minimum, maximum] range:
 *   0-10% / 90-100% (or outside the range)  warning
 *   10-25% / 75-90%                          caution
 *   25-75%                                   nominal
 */
export type EnvelopeLevel = 'nominal' | 'caution' | 'warning' | 'none';

export const ENVELOPE_BANDS = { warning: 0.1, caution: 0.25 };

export function envelopePct(value: number | null, min: number, max: number): number {
  if (value === null || min == null || max == null || max <= min) {
    return 0;
  }
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export function envelopeLevel(value: number | null, min: number, max: number): EnvelopeLevel {
  if (value === null || min == null || max == null || max <= min) {
    return 'none';
  }
  const f = (value - min) / (max - min);
  const edge = Math.min(f, 1 - f);
  if (edge < ENVELOPE_BANDS.warning) {
    return 'warning';
  }
  if (edge < ENVELOPE_BANDS.caution) {
    return 'caution';
  }
  return 'nominal';
}
