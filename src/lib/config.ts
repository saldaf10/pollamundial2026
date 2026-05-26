// June 11, 2026 at 00:00 Colombia time (UTC-5 = 05:00 UTC)
export const PREDICTIONS_DEADLINE_ISO = '2026-06-11T05:00:00.000Z';
export const PREDICTIONS_DEADLINE = new Date(PREDICTIONS_DEADLINE_ISO);

export function predictionsAreClosed(): boolean {
  return new Date() >= PREDICTIONS_DEADLINE;
}
