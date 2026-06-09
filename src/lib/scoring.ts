export interface ScoreEntry { home: number; away: number; }
export type Side = 'home' | 'away';

export interface RoundRules {
  exact: number;
  result: number;
  classified?: number;
  champion?: number;
  subchampion?: number;
}

// Reglas Polla Colegio Fontán
export const ROUND_RULES: Record<string, RoundRules> = {
  group: { exact: 4,  result: 2  },
  r32:   { exact: 6,  result: 4,  classified: 15 }, // Dieciseisavos (mismas que octavos)
  r16:   { exact: 6,  result: 4,  classified: 15 }, // Octavos
  qf:    { exact: 8,  result: 6,  classified: 20 }, // Cuartos
  sf:    { exact: 10, result: 8,  classified: 25 }, // Semis
  '3p':  { exact: 14, result: 10, classified: 30 }, // 3er puesto
  final: { exact: 20, result: 10, champion: 50, subchampion: 40 },
};

export const ROUND_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  r32:   'Dieciseisavos',
  r16:   'Octavos',
  qf:    'Cuartos',
  sf:    'Semifinales',
  '3p':  '3er Puesto',
  final: 'Final',
};

// 10 pts posición exacta, 5 pts clasificado posición incorrecta
export const GROUP_POS_RULES = { exact: 10, wrong: 5 };

export function derivedWinner(s: ScoreEntry): Side | null {
  if (s.home > s.away) return 'home';
  if (s.away > s.home) return 'away';
  return null;
}

export function calcMatchPoints(pred: ScoreEntry, actual: ScoreEntry, round: string): number {
  const rules = ROUND_RULES[round] ?? ROUND_RULES.group;
  if (pred.home === actual.home && pred.away === actual.away) return rules.exact;
  const ps = Math.sign(pred.home - pred.away);
  const as = Math.sign(actual.home - actual.away);
  if (ps === as) return rules.result;
  return 0;
}

export function calcClassifiedPoints(
  predScore: ScoreEntry,
  predWinner: Side | null,
  actualScore: ScoreEntry,
  actualWinner: Side | null,
  round: string
): number {
  const rules = ROUND_RULES[round];
  if (!rules) return 0;
  const pw = predWinner ?? derivedWinner(predScore);
  const aw = actualWinner ?? derivedWinner(actualScore);
  if (!pw || !aw) return 0;

  if (round === 'final') {
    let pts = 0;
    if (pw === aw) pts += rules.champion ?? 0;
    const predLoser: Side = pw === 'home' ? 'away' : 'home';
    const actualLoser: Side = aw === 'home' ? 'away' : 'home';
    if (predLoser === actualLoser) pts += rules.subchampion ?? 0;
    return pts;
  }
  return pw === aw ? (rules.classified ?? 0) : 0;
}

export function calcGroupPositionPoints(
  predicted: { first: string; second: string; third?: string },
  actual: { first: string; second: string; third?: string; thirdClassified?: boolean }
): number {
  let pts = 0;
  if (predicted.first === actual.first) pts += GROUP_POS_RULES.exact;
  else if (predicted.first === actual.second) pts += GROUP_POS_RULES.wrong;
  if (predicted.second === actual.second) pts += GROUP_POS_RULES.exact;
  else if (predicted.second === actual.first) pts += GROUP_POS_RULES.wrong;
  if (predicted.third && actual.third && predicted.third === actual.third && actual.thirdClassified)
    pts += GROUP_POS_RULES.exact;
  return pts;
}
