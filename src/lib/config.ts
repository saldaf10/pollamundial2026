// June 12, 2026 at 14:00 Colombia time (UTC-5 = 19:00 UTC)
export const PREDICTIONS_DEADLINE_ISO = '2026-06-12T19:00:00.000Z';
export const PREDICTIONS_DEADLINE = new Date(PREDICTIONS_DEADLINE_ISO);

// Same deadline for group position predictions
export const GROUP_POS_DEADLINE_ISO = '2026-06-12T19:00:00.000Z';
export const GROUP_POS_DEADLINE = new Date(GROUP_POS_DEADLINE_ISO);

export function predictionsAreClosed(): boolean {
  return new Date() >= PREDICTIONS_DEADLINE;
}

export function groupPosAreClosed(): boolean {
  return new Date() >= GROUP_POS_DEADLINE;
}
