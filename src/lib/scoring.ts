import { KO_FEEDERS, KNOCKOUT_MATCH_IDS, getMatchById } from './matchData';

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
  final: { exact: 20, result: 10, champion: 50 }, // solo campeón (sin subcampeón)
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

// ─── Bracket eliminatorio ───────────────────────────────────────────────────

export interface KnockoutScore { home: number; away: number; winner?: Side }
export type R32TeamsInput = Record<string, { home: string; away: string }>;
export type KOScoreMap = Record<string, KnockoutScore>;
// Por cada partido: equipos del cruce (códigos), quién avanza y quién pierde.
export interface KOSlot { home?: string; away?: string; adv?: string; loser?: string }

// Lado que avanza: el de mayor marcador; si hay empate, el ganador por penales.
function advancingSide(s: KnockoutScore): Side | null {
  if (s.home > s.away) return 'home';
  if (s.away > s.home) return 'away';
  return s.winner ?? null;
}

// Resuelve el bracket completo (16avos→final) a partir de los equipos de 16avos
// y un mapa de marcadores (real o de un participante). Las llaves cuyos feeders
// no estén resueltos quedan sin equipos.
export function resolveBracket(r32Teams: R32TeamsInput, scores: KOScoreMap): Record<number, KOSlot> {
  const out: Record<number, KOSlot> = {};
  const resolve = (id: number): KOSlot => {
    if (out[id]) return out[id];
    const slot: KOSlot = {};
    const feeder = KO_FEEDERS[id];
    if (!feeder) {
      const tt = r32Teams[String(id)]; // 16avos: equipos asignados por el admin
      if (tt) { slot.home = tt.home; slot.away = tt.away; }
    } else {
      const h = resolve(feeder.home.match);
      const a = resolve(feeder.away.match);
      slot.home = feeder.home.type === 'winner' ? h.adv : h.loser;
      slot.away = feeder.away.type === 'winner' ? a.adv : a.loser;
    }
    const sc = scores[String(id)];
    if (slot.home && slot.away && sc) {
      const side = advancingSide(sc);
      if (side) {
        slot.adv   = side === 'home' ? slot.home : slot.away;
        slot.loser = side === 'home' ? slot.away : slot.home;
      }
    }
    out[id] = slot;
    return slot;
  };
  for (const id of KNOCKOUT_MATCH_IDS) resolve(id);
  return out;
}

// Partidos de mata-mata que NO otorgan puntos (p.ej. jugados antes de que se
// cerraran los pronósticos). El partido SÍ sigue alimentando el bracket —su
// ganador avanza a la siguiente llave— pero no suma puntos de avance ni marcador.
export const NON_SCORING_MATCH_IDS = new Set<number>([
  73, // 16avos Sudáfrica vs Canadá (28 jun 2026): se jugó antes de cerrar pronósticos
]);

export interface KOPointsBreakdown { advance: number; score: number; total: number }

// Puntos de mata-mata de un participante. Compara su bracket (que fluye según sus
// propias predicciones) contra el bracket real, por identidad de equipo:
//  - "clasificado/campeón": acertar el equipo que avanza de cada llave real jugada.
//  - "marcador": exacto/resultado, solo si el cruce (ambos equipos) coincide con la realidad.
// Si un participante hizo avanzar a un equipo que no avanzó, esa llave da 0 y arrastra
// 0 a las siguientes llaves que dependan de ese equipo.
export function computeKnockoutPoints(
  r32Teams: R32TeamsInput,
  results: Record<string, { home: number; away: number; played?: boolean; winner?: Side }>,
  scorePreds: KOScoreMap
): KOPointsBreakdown {
  const realScores: KOScoreMap = {};
  for (const [id, r] of Object.entries(results)) {
    if (r.played === false) continue;
    realScores[id] = { home: r.home, away: r.away, ...(r.winner ? { winner: r.winner } : {}) };
  }
  const realB = resolveBracket(r32Teams, realScores);
  const predB = resolveBracket(r32Teams, scorePreds);

  let advance = 0, score = 0;
  for (const id of KNOCKOUT_MATCH_IDS) {
    if (NON_SCORING_MATCH_IDS.has(id)) continue; // no suma puntos, pero ya alimentó el bracket
    const real = realB[id];
    const realScore = realScores[String(id)];
    if (!real || real.adv === undefined || !realScore) continue; // sin resultado real
    const match = getMatchById(id);
    if (!match) continue;
    const rules = ROUND_RULES[match.round];
    if (!rules) continue;
    const pred = predB[id];
    const predScore = scorePreds[String(id)];
    if (!pred || !predScore) continue;

    if (pred.adv !== undefined && pred.adv === real.adv)
      advance += match.round === 'final' ? (rules.champion ?? 0) : (rules.classified ?? 0);

    if (pred.home === real.home && pred.away === real.away)
      score += calcMatchPoints(predScore, realScore, match.round);
  }
  return { advance, score, total: advance + score };
}
