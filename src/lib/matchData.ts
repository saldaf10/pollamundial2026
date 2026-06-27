export interface Team {
  code: string;
  name: string;
  isoCode: string;
}

export interface Match {
  id: number;
  group?: string;
  round: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3p' | 'final';
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  venue: string;
}

const TEAMS: Record<string, Team> = {
  A1: { code: 'A1', name: 'México',          isoCode: 'mx' },
  A2: { code: 'A2', name: 'Sudáfrica',        isoCode: 'za' },
  A3: { code: 'A3', name: 'Corea del Sur',    isoCode: 'kr' },
  A4: { code: 'A4', name: 'Rep. Checa',       isoCode: 'cz' },
  B1: { code: 'B1', name: 'Canadá',           isoCode: 'ca' },
  B2: { code: 'B2', name: 'Bosnia-Herzeg.',   isoCode: 'ba' },
  B3: { code: 'B3', name: 'Qatar',            isoCode: 'qa' },
  B4: { code: 'B4', name: 'Suiza',            isoCode: 'ch' },
  C1: { code: 'C1', name: 'Brasil',           isoCode: 'br' },
  C2: { code: 'C2', name: 'Marruecos',        isoCode: 'ma' },
  C3: { code: 'C3', name: 'Haití',            isoCode: 'ht' },
  C4: { code: 'C4', name: 'Escocia',          isoCode: 'gb-sct' },
  D1: { code: 'D1', name: 'EE.UU.',           isoCode: 'us' },
  D2: { code: 'D2', name: 'Paraguay',         isoCode: 'py' },
  D3: { code: 'D3', name: 'Australia',        isoCode: 'au' },
  D4: { code: 'D4', name: 'Turquía',          isoCode: 'tr' },
  E1: { code: 'E1', name: 'Alemania',         isoCode: 'de' },
  E2: { code: 'E2', name: 'Curazao',          isoCode: 'cw' },
  E3: { code: 'E3', name: 'Costa de Marfil',  isoCode: 'ci' },
  E4: { code: 'E4', name: 'Ecuador',          isoCode: 'ec' },
  F1: { code: 'F1', name: 'Países Bajos',     isoCode: 'nl' },
  F2: { code: 'F2', name: 'Japón',            isoCode: 'jp' },
  F3: { code: 'F3', name: 'Suecia',           isoCode: 'se' },
  F4: { code: 'F4', name: 'Túnez',            isoCode: 'tn' },
  G1: { code: 'G1', name: 'Bélgica',          isoCode: 'be' },
  G2: { code: 'G2', name: 'Egipto',           isoCode: 'eg' },
  G3: { code: 'G3', name: 'Irán',             isoCode: 'ir' },
  G4: { code: 'G4', name: 'Nueva Zelanda',    isoCode: 'nz' },
  H1: { code: 'H1', name: 'España',           isoCode: 'es' },
  H2: { code: 'H2', name: 'Cabo Verde',       isoCode: 'cv' },
  H3: { code: 'H3', name: 'Arabia Saudita',   isoCode: 'sa' },
  H4: { code: 'H4', name: 'Uruguay',          isoCode: 'uy' },
  I1: { code: 'I1', name: 'Francia',          isoCode: 'fr' },
  I2: { code: 'I2', name: 'Senegal',          isoCode: 'sn' },
  I3: { code: 'I3', name: 'Iraq',             isoCode: 'iq' },
  I4: { code: 'I4', name: 'Noruega',          isoCode: 'no' },
  J1: { code: 'J1', name: 'Argentina',        isoCode: 'ar' },
  J2: { code: 'J2', name: 'Argelia',          isoCode: 'dz' },
  J3: { code: 'J3', name: 'Austria',          isoCode: 'at' },
  J4: { code: 'J4', name: 'Jordania',         isoCode: 'jo' },
  K1: { code: 'K1', name: 'Portugal',         isoCode: 'pt' },
  K2: { code: 'K2', name: 'RD Congo',         isoCode: 'cd' },
  K3: { code: 'K3', name: 'Uzbekistán',       isoCode: 'uz' },
  K4: { code: 'K4', name: 'Colombia',         isoCode: 'co' },
  L1: { code: 'L1', name: 'Inglaterra',       isoCode: 'gb-eng' },
  L2: { code: 'L2', name: 'Croacia',          isoCode: 'hr' },
  L3: { code: 'L3', name: 'Ghana',            isoCode: 'gh' },
  L4: { code: 'L4', name: 'Panamá',           isoCode: 'pa' },
};

const t = (code: string): Team => TEAMS[code];
const mkTBD = (label: string): Team => ({ code: label, name: label, isoCode: '' });

export function getTeamByCode(code: string): Team | undefined {
  return TEAMS[code];
}

export const GROUP_MATCHES: Match[] = [
  // Group A
  { id: 1,  group: 'A', round: 'group', homeTeam: t('A1'), awayTeam: t('A2'), date: '2026-06-11', venue: 'Mexico City' },
  { id: 2,  group: 'A', round: 'group', homeTeam: t('A3'), awayTeam: t('A4'), date: '2026-06-11', venue: 'Guadalajara' },
  { id: 25, group: 'A', round: 'group', homeTeam: t('A4'), awayTeam: t('A2'), date: '2026-06-18', venue: 'Atlanta' },
  { id: 28, group: 'A', round: 'group', homeTeam: t('A1'), awayTeam: t('A3'), date: '2026-06-18', venue: 'Guadalajara' },
  { id: 53, group: 'A', round: 'group', homeTeam: t('A4'), awayTeam: t('A1'), date: '2026-06-24', venue: 'Mexico City' },
  { id: 54, group: 'A', round: 'group', homeTeam: t('A2'), awayTeam: t('A3'), date: '2026-06-24', venue: 'Monterrey' },
  // Group B
  { id: 3,  group: 'B', round: 'group', homeTeam: t('B1'), awayTeam: t('B2'), date: '2026-06-12', venue: 'Toronto' },
  { id: 8,  group: 'B', round: 'group', homeTeam: t('B3'), awayTeam: t('B4'), date: '2026-06-13', venue: 'San Francisco' },
  { id: 26, group: 'B', round: 'group', homeTeam: t('B4'), awayTeam: t('B2'), date: '2026-06-18', venue: 'Los Angeles' },
  { id: 27, group: 'B', round: 'group', homeTeam: t('B1'), awayTeam: t('B3'), date: '2026-06-18', venue: 'Vancouver' },
  { id: 51, group: 'B', round: 'group', homeTeam: t('B4'), awayTeam: t('B1'), date: '2026-06-24', venue: 'Vancouver' },
  { id: 52, group: 'B', round: 'group', homeTeam: t('B2'), awayTeam: t('B3'), date: '2026-06-24', venue: 'Seattle' },
  // Group C
  { id: 7,  group: 'C', round: 'group', homeTeam: t('C1'), awayTeam: t('C2'), date: '2026-06-13', venue: 'New York/NJ' },
  { id: 5,  group: 'C', round: 'group', homeTeam: t('C3'), awayTeam: t('C4'), date: '2026-06-13', venue: 'Boston' },
  { id: 29, group: 'C', round: 'group', homeTeam: t('C1'), awayTeam: t('C3'), date: '2026-06-19', venue: 'Philadelphia' },
  { id: 30, group: 'C', round: 'group', homeTeam: t('C4'), awayTeam: t('C2'), date: '2026-06-19', venue: 'Boston' },
  { id: 49, group: 'C', round: 'group', homeTeam: t('C4'), awayTeam: t('C1'), date: '2026-06-24', venue: 'Miami' },
  { id: 50, group: 'C', round: 'group', homeTeam: t('C2'), awayTeam: t('C3'), date: '2026-06-24', venue: 'Atlanta' },
  // Group D
  { id: 4,  group: 'D', round: 'group', homeTeam: t('D1'), awayTeam: t('D2'), date: '2026-06-12', venue: 'Los Angeles' },
  { id: 6,  group: 'D', round: 'group', homeTeam: t('D3'), awayTeam: t('D4'), date: '2026-06-13', venue: 'Vancouver' },
  { id: 32, group: 'D', round: 'group', homeTeam: t('D1'), awayTeam: t('D3'), date: '2026-06-19', venue: 'Seattle' },
  { id: 31, group: 'D', round: 'group', homeTeam: t('D4'), awayTeam: t('D2'), date: '2026-06-19', venue: 'San Francisco' },
  { id: 59, group: 'D', round: 'group', homeTeam: t('D4'), awayTeam: t('D1'), date: '2026-06-25', venue: 'Los Angeles' },
  { id: 60, group: 'D', round: 'group', homeTeam: t('D2'), awayTeam: t('D3'), date: '2026-06-25', venue: 'San Francisco' },
  // Group E
  { id: 10, group: 'E', round: 'group', homeTeam: t('E1'), awayTeam: t('E2'), date: '2026-06-14', venue: 'Houston' },
  { id: 9,  group: 'E', round: 'group', homeTeam: t('E3'), awayTeam: t('E4'), date: '2026-06-14', venue: 'Philadelphia' },
  { id: 33, group: 'E', round: 'group', homeTeam: t('E1'), awayTeam: t('E3'), date: '2026-06-20', venue: 'Toronto' },
  { id: 34, group: 'E', round: 'group', homeTeam: t('E4'), awayTeam: t('E2'), date: '2026-06-20', venue: 'Kansas City' },
  { id: 56, group: 'E', round: 'group', homeTeam: t('E4'), awayTeam: t('E1'), date: '2026-06-25', venue: 'New York/NJ' },
  { id: 55, group: 'E', round: 'group', homeTeam: t('E2'), awayTeam: t('E3'), date: '2026-06-25', venue: 'Philadelphia' },
  // Group F
  { id: 11, group: 'F', round: 'group', homeTeam: t('F1'), awayTeam: t('F2'), date: '2026-06-14', venue: 'Dallas' },
  { id: 12, group: 'F', round: 'group', homeTeam: t('F3'), awayTeam: t('F4'), date: '2026-06-14', venue: 'Monterrey' },
  { id: 35, group: 'F', round: 'group', homeTeam: t('F1'), awayTeam: t('F3'), date: '2026-06-20', venue: 'Houston' },
  { id: 36, group: 'F', round: 'group', homeTeam: t('F4'), awayTeam: t('F2'), date: '2026-06-21', venue: 'Monterrey' },
  { id: 58, group: 'F', round: 'group', homeTeam: t('F4'), awayTeam: t('F1'), date: '2026-06-25', venue: 'Kansas City' },
  { id: 57, group: 'F', round: 'group', homeTeam: t('F2'), awayTeam: t('F3'), date: '2026-06-25', venue: 'Dallas' },
  // Group G
  { id: 16, group: 'G', round: 'group', homeTeam: t('G1'), awayTeam: t('G2'), date: '2026-06-15', venue: 'Seattle' },
  { id: 15, group: 'G', round: 'group', homeTeam: t('G3'), awayTeam: t('G4'), date: '2026-06-15', venue: 'Los Angeles' },
  { id: 39, group: 'G', round: 'group', homeTeam: t('G1'), awayTeam: t('G3'), date: '2026-06-21', venue: 'Los Angeles' },
  { id: 40, group: 'G', round: 'group', homeTeam: t('G4'), awayTeam: t('G2'), date: '2026-06-21', venue: 'Vancouver' },
  { id: 64, group: 'G', round: 'group', homeTeam: t('G4'), awayTeam: t('G1'), date: '2026-06-26', venue: 'Vancouver' },
  { id: 63, group: 'G', round: 'group', homeTeam: t('G2'), awayTeam: t('G3'), date: '2026-06-26', venue: 'Seattle' },
  // Group H
  { id: 14, group: 'H', round: 'group', homeTeam: t('H1'), awayTeam: t('H2'), date: '2026-06-15', venue: 'Atlanta' },
  { id: 13, group: 'H', round: 'group', homeTeam: t('H3'), awayTeam: t('H4'), date: '2026-06-15', venue: 'Miami' },
  { id: 38, group: 'H', round: 'group', homeTeam: t('H1'), awayTeam: t('H3'), date: '2026-06-21', venue: 'Atlanta' },
  { id: 37, group: 'H', round: 'group', homeTeam: t('H4'), awayTeam: t('H2'), date: '2026-06-21', venue: 'Miami' },
  { id: 66, group: 'H', round: 'group', homeTeam: t('H4'), awayTeam: t('H1'), date: '2026-06-26', venue: 'Guadalajara' },
  { id: 65, group: 'H', round: 'group', homeTeam: t('H2'), awayTeam: t('H3'), date: '2026-06-26', venue: 'Houston' },
  // Group I
  { id: 17, group: 'I', round: 'group', homeTeam: t('I1'), awayTeam: t('I2'), date: '2026-06-16', venue: 'New York/NJ' },
  { id: 18, group: 'I', round: 'group', homeTeam: t('I3'), awayTeam: t('I4'), date: '2026-06-16', venue: 'Boston' },
  { id: 42, group: 'I', round: 'group', homeTeam: t('I1'), awayTeam: t('I3'), date: '2026-06-22', venue: 'Philadelphia' },
  { id: 41, group: 'I', round: 'group', homeTeam: t('I4'), awayTeam: t('I2'), date: '2026-06-22', venue: 'New York/NJ' },
  { id: 61, group: 'I', round: 'group', homeTeam: t('I4'), awayTeam: t('I1'), date: '2026-06-26', venue: 'Boston' },
  { id: 62, group: 'I', round: 'group', homeTeam: t('I2'), awayTeam: t('I3'), date: '2026-06-26', venue: 'Toronto' },
  // Group J
  { id: 19, group: 'J', round: 'group', homeTeam: t('J1'), awayTeam: t('J2'), date: '2026-06-16', venue: 'Kansas City' },
  { id: 20, group: 'J', round: 'group', homeTeam: t('J3'), awayTeam: t('J4'), date: '2026-06-17', venue: 'San Francisco' },
  { id: 43, group: 'J', round: 'group', homeTeam: t('J1'), awayTeam: t('J3'), date: '2026-06-22', venue: 'Dallas' },
  { id: 44, group: 'J', round: 'group', homeTeam: t('J4'), awayTeam: t('J2'), date: '2026-06-22', venue: 'San Francisco' },
  { id: 70, group: 'J', round: 'group', homeTeam: t('J4'), awayTeam: t('J1'), date: '2026-06-27', venue: 'Dallas' },
  { id: 69, group: 'J', round: 'group', homeTeam: t('J2'), awayTeam: t('J3'), date: '2026-06-27', venue: 'Kansas City' },
  // Group K
  { id: 23, group: 'K', round: 'group', homeTeam: t('K1'), awayTeam: t('K2'), date: '2026-06-17', venue: 'Houston' },
  { id: 24, group: 'K', round: 'group', homeTeam: t('K3'), awayTeam: t('K4'), date: '2026-06-17', venue: 'Mexico City' },
  { id: 47, group: 'K', round: 'group', homeTeam: t('K1'), awayTeam: t('K3'), date: '2026-06-23', venue: 'Houston' },
  { id: 48, group: 'K', round: 'group', homeTeam: t('K4'), awayTeam: t('K2'), date: '2026-06-23', venue: 'Guadalajara' },
  { id: 71, group: 'K', round: 'group', homeTeam: t('K4'), awayTeam: t('K1'), date: '2026-06-27', venue: 'Miami' },
  { id: 72, group: 'K', round: 'group', homeTeam: t('K2'), awayTeam: t('K3'), date: '2026-06-27', venue: 'Atlanta' },
  // Group L
  { id: 22, group: 'L', round: 'group', homeTeam: t('L1'), awayTeam: t('L2'), date: '2026-06-17', venue: 'Dallas' },
  { id: 21, group: 'L', round: 'group', homeTeam: t('L3'), awayTeam: t('L4'), date: '2026-06-17', venue: 'Toronto' },
  { id: 45, group: 'L', round: 'group', homeTeam: t('L1'), awayTeam: t('L3'), date: '2026-06-23', venue: 'Boston' },
  { id: 46, group: 'L', round: 'group', homeTeam: t('L4'), awayTeam: t('L2'), date: '2026-06-23', venue: 'Toronto' },
  { id: 67, group: 'L', round: 'group', homeTeam: t('L4'), awayTeam: t('L1'), date: '2026-06-27', venue: 'New York/NJ' },
  { id: 68, group: 'L', round: 'group', homeTeam: t('L2'), awayTeam: t('L3'), date: '2026-06-27', venue: 'Philadelphia' },
];

export const R32_MATCHES: Match[] = [
  { id: 73, round: 'r32', homeTeam: mkTBD('2°A'), awayTeam: mkTBD('2°B'), date: '2026-06-28', venue: 'Los Angeles' },
  { id: 74, round: 'r32', homeTeam: mkTBD('1°E'), awayTeam: mkTBD('3° ABCDF'), date: '2026-06-29', venue: 'Boston' },
  { id: 75, round: 'r32', homeTeam: mkTBD('1°F'), awayTeam: mkTBD('2°C'), date: '2026-06-29', venue: 'Monterrey' },
  { id: 76, round: 'r32', homeTeam: mkTBD('1°C'), awayTeam: mkTBD('2°F'), date: '2026-06-29', venue: 'Houston' },
  { id: 77, round: 'r32', homeTeam: mkTBD('1°I'), awayTeam: mkTBD('3° CDFGH'), date: '2026-06-30', venue: 'New York/NJ' },
  { id: 78, round: 'r32', homeTeam: mkTBD('2°E'), awayTeam: mkTBD('2°I'), date: '2026-06-30', venue: 'Dallas' },
  { id: 79, round: 'r32', homeTeam: mkTBD('1°A'), awayTeam: mkTBD('3° CEFHI'), date: '2026-06-30', venue: 'Mexico City' },
  { id: 80, round: 'r32', homeTeam: mkTBD('1°L'), awayTeam: mkTBD('3° EHIJK'), date: '2026-07-01', venue: 'Atlanta' },
  { id: 81, round: 'r32', homeTeam: mkTBD('1°D'), awayTeam: mkTBD('3° BEFIJ'), date: '2026-07-01', venue: 'San Francisco' },
  { id: 82, round: 'r32', homeTeam: mkTBD('1°G'), awayTeam: mkTBD('3° AEHIJ'), date: '2026-07-01', venue: 'Seattle' },
  { id: 83, round: 'r32', homeTeam: mkTBD('2°K'), awayTeam: mkTBD('2°L'), date: '2026-07-02', venue: 'Toronto' },
  { id: 84, round: 'r32', homeTeam: mkTBD('1°H'), awayTeam: mkTBD('2°J'), date: '2026-07-02', venue: 'Los Angeles' },
  { id: 85, round: 'r32', homeTeam: mkTBD('1°B'), awayTeam: mkTBD('3° EFGIJ'), date: '2026-07-02', venue: 'Vancouver' },
  { id: 86, round: 'r32', homeTeam: mkTBD('1°J'), awayTeam: mkTBD('2°H'), date: '2026-07-03', venue: 'Miami' },
  { id: 87, round: 'r32', homeTeam: mkTBD('1°K'), awayTeam: mkTBD('3° DEIJL'), date: '2026-07-03', venue: 'Kansas City' },
  { id: 88, round: 'r32', homeTeam: mkTBD('2°D'), awayTeam: mkTBD('2°G'), date: '2026-07-03', venue: 'Dallas' },
];

export const R16_MATCHES: Match[] = [
  { id: 89, round: 'r16', homeTeam: mkTBD('W74'), awayTeam: mkTBD('W77'), date: '2026-07-04', venue: 'Philadelphia' },
  { id: 90, round: 'r16', homeTeam: mkTBD('W73'), awayTeam: mkTBD('W75'), date: '2026-07-04', venue: 'Houston' },
  { id: 91, round: 'r16', homeTeam: mkTBD('W76'), awayTeam: mkTBD('W78'), date: '2026-07-05', venue: 'New York/NJ' },
  { id: 92, round: 'r16', homeTeam: mkTBD('W79'), awayTeam: mkTBD('W80'), date: '2026-07-05', venue: 'Mexico City' },
  { id: 93, round: 'r16', homeTeam: mkTBD('W83'), awayTeam: mkTBD('W84'), date: '2026-07-06', venue: 'Dallas' },
  { id: 94, round: 'r16', homeTeam: mkTBD('W81'), awayTeam: mkTBD('W82'), date: '2026-07-06', venue: 'Seattle' },
  { id: 95, round: 'r16', homeTeam: mkTBD('W86'), awayTeam: mkTBD('W88'), date: '2026-07-07', venue: 'Atlanta' },
  { id: 96, round: 'r16', homeTeam: mkTBD('W85'), awayTeam: mkTBD('W87'), date: '2026-07-07', venue: 'Vancouver' },
];

export const QF_MATCHES: Match[] = [
  { id: 97,  round: 'qf', homeTeam: mkTBD('W89'), awayTeam: mkTBD('W90'), date: '2026-07-09', venue: 'Boston' },
  { id: 98,  round: 'qf', homeTeam: mkTBD('W93'), awayTeam: mkTBD('W94'), date: '2026-07-10', venue: 'Los Angeles' },
  { id: 99,  round: 'qf', homeTeam: mkTBD('W91'), awayTeam: mkTBD('W92'), date: '2026-07-11', venue: 'Miami' },
  { id: 100, round: 'qf', homeTeam: mkTBD('W95'), awayTeam: mkTBD('W96'), date: '2026-07-11', venue: 'Kansas City' },
];

export const SF_MATCHES: Match[] = [
  { id: 101, round: 'sf', homeTeam: mkTBD('W97'), awayTeam: mkTBD('W98'),   date: '2026-07-14', venue: 'Dallas' },
  { id: 102, round: 'sf', homeTeam: mkTBD('W99'), awayTeam: mkTBD('W100'),  date: '2026-07-15', venue: 'Atlanta' },
];

export const THIRD_PLACE_MATCH: Match = {
  id: 103, round: '3p',
  homeTeam: mkTBD('Perdedor SF1'), awayTeam: mkTBD('Perdedor SF2'),
  date: '2026-07-18', venue: 'Miami',
};

export const FINAL_MATCH: Match = {
  id: 104, round: 'final',
  homeTeam: mkTBD('Ganador SF1'), awayTeam: mkTBD('Ganador SF2'),
  date: '2026-07-19', venue: 'New York/NJ',
};

export const ALL_MATCHES: Match[] = [
  ...GROUP_MATCHES, ...R32_MATCHES, ...R16_MATCHES,
  ...QF_MATCHES, ...SF_MATCHES, THIRD_PLACE_MATCH, FINAL_MATCH,
];

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// ─── Bracket feeders ────────────────────────────────────────────────────────
// De qué partido sale cada equipo de una llave eliminatoria a partir de octavos.
// 'winner' = el que avanza de ese partido; 'loser' = el que pierde (para el 3er puesto).
// Los 16avos (73–88) NO tienen feeders: sus equipos los asigna el admin (tabla r32_teams).
export type Feeder = { type: 'winner' | 'loser'; match: number };
export const KO_FEEDERS: Record<number, { home: Feeder; away: Feeder }> = {
  // Octavos (r16)
  89: { home: { type: 'winner', match: 74 }, away: { type: 'winner', match: 77 } },
  90: { home: { type: 'winner', match: 73 }, away: { type: 'winner', match: 75 } },
  91: { home: { type: 'winner', match: 76 }, away: { type: 'winner', match: 78 } },
  92: { home: { type: 'winner', match: 79 }, away: { type: 'winner', match: 80 } },
  93: { home: { type: 'winner', match: 83 }, away: { type: 'winner', match: 84 } },
  94: { home: { type: 'winner', match: 81 }, away: { type: 'winner', match: 82 } },
  95: { home: { type: 'winner', match: 86 }, away: { type: 'winner', match: 88 } },
  96: { home: { type: 'winner', match: 85 }, away: { type: 'winner', match: 87 } },
  // Cuartos (qf)
  97:  { home: { type: 'winner', match: 89 }, away: { type: 'winner', match: 90 } },
  98:  { home: { type: 'winner', match: 93 }, away: { type: 'winner', match: 94 } },
  99:  { home: { type: 'winner', match: 91 }, away: { type: 'winner', match: 92 } },
  100: { home: { type: 'winner', match: 95 }, away: { type: 'winner', match: 96 } },
  // Semifinales (sf)
  101: { home: { type: 'winner', match: 97 }, away: { type: 'winner', match: 98 } },
  102: { home: { type: 'winner', match: 99 }, away: { type: 'winner', match: 100 } },
  // 3er puesto (perdedores de semis)
  103: { home: { type: 'loser', match: 101 }, away: { type: 'loser', match: 102 } },
  // Final (ganadores de semis)
  104: { home: { type: 'winner', match: 101 }, away: { type: 'winner', match: 102 } },
};

// IDs de partidos de mata-mata (16avos → final), en orden.
export const KNOCKOUT_MATCH_IDS: number[] = [
  ...R32_MATCHES, ...R16_MATCHES, ...QF_MATCHES, ...SF_MATCHES, THIRD_PLACE_MATCH, FINAL_MATCH,
].map(m => m.id);

export function getMatchesByGroup(group: string): Match[] {
  return GROUP_MATCHES.filter(m => m.group === group).sort((a, b) => a.id - b.id);
}

export function getGroupTeams(group: string): Team[] {
  const matches = getMatchesByGroup(group);
  const map = new Map<string, Team>();
  matches.forEach(m => {
    map.set(m.homeTeam.code, m.homeTeam);
    map.set(m.awayTeam.code, m.awayTeam);
  });
  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export function getMatchById(id: number): Match | undefined {
  return ALL_MATCHES.find(m => m.id === id);
}

export const KNOCKOUT_ROUNDS: Array<{ label: string; key: string; matches: Match[] }> = [
  { label: 'Dieciseisavos', key: 'r32', matches: R32_MATCHES },
  { label: 'Octavos',       key: 'r16', matches: R16_MATCHES },
  { label: 'Cuartos',       key: 'qf',  matches: QF_MATCHES },
  { label: 'Semifinales',   key: 'sf',  matches: SF_MATCHES },
  { label: '3er Puesto',    key: '3p',  matches: [THIRD_PLACE_MATCH] },
  { label: 'Final',         key: 'final', matches: [FINAL_MATCH] },
];
