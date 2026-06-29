// June 12, 2026 at 14:00 Colombia time (UTC-5 = 19:00 UTC)
export const PREDICTIONS_DEADLINE_ISO = '2026-06-12T19:00:00.000Z';
export const PREDICTIONS_DEADLINE = new Date(PREDICTIONS_DEADLINE_ISO);

// Same deadline for group position predictions
export const GROUP_POS_DEADLINE_ISO = '2026-06-12T19:00:00.000Z';
export const GROUP_POS_DEADLINE = new Date(GROUP_POS_DEADLINE_ISO);

// Cierre de pronósticos del mata-mata: 29 jun 2026 a las 2:00 p.m. hora Colombia
// (UTC-5 = 19:00 UTC). Se extendió hasta las 2pm para que quienes entraron tarde
// (y se quedaron bloqueados por la cascada del partido Sudáfrica-Canadá) alcancen a
// terminar su bracket. Brasil vs Japón (match 76) arranca a las 12:00 y se bloquea
// individualmente (locked en results) para que no se pueda editar con el partido en
// juego, aunque el resto del cuadro siga abierto hasta las 2pm.
export const KNOCKOUT_DEADLINE_ISO = '2026-06-29T19:00:00.000Z';
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
