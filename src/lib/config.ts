// June 12, 2026 at 14:00 Colombia time (UTC-5 = 19:00 UTC)
export const PREDICTIONS_DEADLINE_ISO = '2026-06-12T19:00:00.000Z';
export const PREDICTIONS_DEADLINE = new Date(PREDICTIONS_DEADLINE_ISO);

// Same deadline for group position predictions
export const GROUP_POS_DEADLINE_ISO = '2026-06-12T19:00:00.000Z';
export const GROUP_POS_DEADLINE = new Date(GROUP_POS_DEADLINE_ISO);

// Cierre de pronósticos del mata-mata: inicio del primer partido de 16avos (28 jun 2026).
// AJUSTAR a la hora real del primer partido antes de abrir los pronósticos.
export const KNOCKOUT_DEADLINE_ISO = '2026-06-28T19:00:00.000Z';
export const KNOCKOUT_DEADLINE = new Date(KNOCKOUT_DEADLINE_ISO);

export function predictionsAreClosed(): boolean {
  return new Date() >= PREDICTIONS_DEADLINE;
}

export function groupPosAreClosed(): boolean {
  return new Date() >= GROUP_POS_DEADLINE;
}

export function knockoutAreClosed(): boolean {
  return new Date() >= KNOCKOUT_DEADLINE;
}
