import { sql } from '@vercel/postgres';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: 'superadmin' | 'admin' | 'participant';
  empresaSlug: string;
  active: boolean;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  username: string;
  role: 'superadmin' | 'admin' | 'participant';
  empresaSlug: string;
  displayName: string;
  createdAt: string;
}

export interface Empresa {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export interface ScorePrediction {
  home: number;
  away: number;
  winner?: 'home' | 'away';
}

export interface ResultEntry {
  home: number;
  away: number;
  played: boolean;
  locked: boolean;
  winner?: 'home' | 'away';
}

export interface GroupPosition {
  first: string;
  second: string;
  third?: string;
}

export interface GroupStanding {
  first: string;
  second: string;
  third?: string;
  thirdClassified?: boolean;
}

export type ScorePredMap = Record<string, Record<string, ScorePrediction>>;
export type GroupPredMap = Record<string, Record<string, GroupPosition>>;
export type ResultsMap   = Record<string, ResultEntry>;
export type StandingsMap = Record<string, GroupStanding>;

// ─── Row converters ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUser(r: any): User {
  return {
    id: r.id,
    username: r.username,
    password: r.password,
    displayName: r.display_name,
    role: r.role,
    empresaSlug: r.empresa_slug,
    active: r.active,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSession(r: any): SessionRecord {
  return {
    token: r.token,
    userId: r.user_id,
    username: r.username,
    role: r.role,
    empresaSlug: r.empresa_slug,
    displayName: r.display_name,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEmpresa(r: any): Empresa {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserByUsername(username: string): Promise<User | null> {
  const { rows } = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  return rows.length ? toUser(rows[0]) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return rows.length ? toUser(rows[0]) : null;
}

export async function getUsersByEmpresa(slug: string): Promise<User[]> {
  const { rows } = await sql`SELECT * FROM users WHERE empresa_slug = ${slug} ORDER BY created_at`;
  return rows.map(toUser);
}

export async function addUser(user: User): Promise<void> {
  await sql`
    INSERT INTO users (id, username, password, display_name, role, empresa_slug, active, created_at)
    VALUES (${user.id}, ${user.username}, ${user.password}, ${user.displayName},
            ${user.role}, ${user.empresaSlug}, ${user.active}, ${user.createdAt})
  `;
}

export async function updateUser(id: string, updates: Partial<Pick<User, 'password' | 'displayName' | 'active'>>): Promise<void> {
  if (updates.password   !== undefined) await sql`UPDATE users SET password     = ${updates.password}   WHERE id = ${id}`;
  if (updates.displayName !== undefined) await sql`UPDATE users SET display_name = ${updates.displayName} WHERE id = ${id}`;
  if (updates.active      !== undefined) await sql`UPDATE users SET active       = ${updates.active}      WHERE id = ${id}`;
}

export async function deleteUsersByEmpresa(slug: string): Promise<void> {
  await sql`DELETE FROM users WHERE empresa_slug = ${slug}`;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSession(token: string): Promise<SessionRecord | null> {
  const { rows } = await sql`SELECT * FROM sessions WHERE token = ${token} LIMIT 1`;
  return rows.length ? toSession(rows[0]) : null;
}

export async function addSession(session: SessionRecord): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await sql`DELETE FROM sessions WHERE created_at < ${cutoff}`;
  await sql`
    INSERT INTO sessions (token, user_id, username, role, empresa_slug, display_name, created_at)
    VALUES (${session.token}, ${session.userId}, ${session.username}, ${session.role},
            ${session.empresaSlug}, ${session.displayName}, ${session.createdAt})
    ON CONFLICT (token) DO NOTHING
  `;
}

export async function removeSession(token: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export async function getSessionFromRequest(headers: Headers): Promise<SessionRecord | null> {
  const token = headers.get('x-session-token');
  if (!token) return null;
  return getSession(token);
}

// ─── Empresas ─────────────────────────────────────────────────────────────────

export async function getEmpresas(): Promise<Empresa[]> {
  const { rows } = await sql`SELECT * FROM empresas ORDER BY created_at`;
  return rows.map(toEmpresa);
}

export async function getEmpresa(slug: string): Promise<Empresa | null> {
  const { rows } = await sql`SELECT * FROM empresas WHERE slug = ${slug} LIMIT 1`;
  return rows.length ? toEmpresa(rows[0]) : null;
}

export async function addEmpresa(e: Empresa): Promise<void> {
  await sql`INSERT INTO empresas (id, slug, name, created_at) VALUES (${e.id}, ${e.slug}, ${e.name}, ${e.createdAt})`;
}

export async function deleteEmpresa(id: string): Promise<void> {
  await sql`DELETE FROM empresas WHERE id = ${id}`;
}

export async function updateEmpresaName(id: string, name: string): Promise<void> {
  await sql`UPDATE empresas SET name = ${name} WHERE id = ${id}`;
}

// ─── Score Predictions ────────────────────────────────────────────────────────

export async function getScorePredictions(empresaSlug: string, username: string): Promise<Record<string, ScorePrediction>> {
  const { rows } = await sql`
    SELECT match_id, home, away, winner FROM predictions
    WHERE empresa_slug = ${empresaSlug} AND username = ${username}
  `;
  const out: Record<string, ScorePrediction> = {};
  for (const r of rows) {
    out[String(r.match_id)] = { home: r.home, away: r.away, ...(r.winner ? { winner: r.winner as 'home' | 'away' } : {}) };
  }
  return out;
}

export async function saveScorePrediction(empresaSlug: string, username: string, matchId: number, pred: ScorePrediction): Promise<void> {
  await sql`
    INSERT INTO predictions (empresa_slug, username, match_id, home, away, winner)
    VALUES (${empresaSlug}, ${username}, ${matchId}, ${pred.home}, ${pred.away}, ${pred.winner ?? null})
    ON CONFLICT (empresa_slug, username, match_id)
    DO UPDATE SET home = EXCLUDED.home, away = EXCLUDED.away, winner = EXCLUDED.winner
  `;
}

export async function getAllScorePredictions(empresaSlug: string): Promise<ScorePredMap> {
  const { rows } = await sql`
    SELECT username, match_id, home, away, winner FROM predictions WHERE empresa_slug = ${empresaSlug}
  `;
  const out: ScorePredMap = {};
  for (const r of rows) {
    if (!out[r.username]) out[r.username] = {};
    out[r.username][String(r.match_id)] = { home: r.home, away: r.away, ...(r.winner ? { winner: r.winner as 'home' | 'away' } : {}) };
  }
  return out;
}

// ─── Group Predictions ────────────────────────────────────────────────────────

export async function getGroupPredictions(empresaSlug: string, username: string): Promise<Record<string, GroupPosition>> {
  const { rows } = await sql`
    SELECT group_name, first, second, third FROM group_predictions
    WHERE empresa_slug = ${empresaSlug} AND username = ${username}
  `;
  const out: Record<string, GroupPosition> = {};
  for (const r of rows) out[r.group_name] = { first: r.first, second: r.second, third: r.third ?? undefined };
  return out;
}

export async function saveGroupPrediction(empresaSlug: string, username: string, group: string, pos: GroupPosition): Promise<void> {
  await sql`
    INSERT INTO group_predictions (empresa_slug, username, group_name, first, second, third)
    VALUES (${empresaSlug}, ${username}, ${group}, ${pos.first}, ${pos.second}, ${pos.third ?? null})
    ON CONFLICT (empresa_slug, username, group_name)
    DO UPDATE SET first = EXCLUDED.first, second = EXCLUDED.second, third = EXCLUDED.third
  `;
}

export async function getAllGroupPredictions(empresaSlug: string): Promise<GroupPredMap> {
  const { rows } = await sql`
    SELECT username, group_name, first, second, third FROM group_predictions WHERE empresa_slug = ${empresaSlug}
  `;
  const out: GroupPredMap = {};
  for (const r of rows) {
    if (!out[r.username]) out[r.username] = {};
    out[r.username][r.group_name] = { first: r.first, second: r.second, third: r.third ?? undefined };
  }
  return out;
}

export async function deletePredictionsByEmpresa(slug: string): Promise<void> {
  await sql`DELETE FROM predictions WHERE empresa_slug = ${slug}`;
  await sql`DELETE FROM group_predictions WHERE empresa_slug = ${slug}`;
}

// ─── Results (global) ─────────────────────────────────────────────────────────

export async function getResults(): Promise<ResultsMap> {
  const { rows } = await sql`SELECT * FROM results`;
  const out: ResultsMap = {};
  for (const r of rows) {
    out[String(r.match_id)] = { home: r.home, away: r.away, played: r.played, locked: r.locked,
      ...(r.winner ? { winner: r.winner as 'home' | 'away' } : {}) };
  }
  return out;
}

export async function setMatchResult(matchId: number, home: number, away: number, winner?: 'home' | 'away'): Promise<void> {
  await sql`
    INSERT INTO results (match_id, home, away, played, locked, winner)
    VALUES (${matchId}, ${home}, ${away}, true, true, ${winner ?? null})
    ON CONFLICT (match_id)
    DO UPDATE SET home = EXCLUDED.home, away = EXCLUDED.away, played = true, locked = true, winner = EXCLUDED.winner
  `;
}

export async function setMatchLocked(matchId: number, locked: boolean): Promise<void> {
  await sql`
    INSERT INTO results (match_id, home, away, played, locked)
    VALUES (${matchId}, 0, 0, false, ${locked})
    ON CONFLICT (match_id)
    DO UPDATE SET locked = EXCLUDED.locked
  `;
}

// ─── Standings (global) ───────────────────────────────────────────────────────

export async function getGroupStandings(): Promise<StandingsMap> {
  const { rows } = await sql`SELECT * FROM standings`;
  const out: StandingsMap = {};
  for (const r of rows) out[r.group_name] = {
    first: r.first, second: r.second,
    third: r.third ?? undefined,
    thirdClassified: r.third_classified ?? false,
  };
  return out;
}

export async function setGroupStanding(
  group: string, first: string, second: string,
  third?: string, thirdClassified?: boolean
): Promise<void> {
  await sql`
    INSERT INTO standings (group_name, first, second, third, third_classified)
    VALUES (${group}, ${first}, ${second}, ${third ?? null}, ${thirdClassified ?? false})
    ON CONFLICT (group_name) DO UPDATE SET
      first = EXCLUDED.first, second = EXCLUDED.second,
      third = EXCLUDED.third, third_classified = EXCLUDED.third_classified
  `;
}

export async function setThirdClassified(group: string, thirdClassified: boolean): Promise<void> {
  await sql`UPDATE standings SET third_classified = ${thirdClassified} WHERE group_name = ${group}`;
}

// ─── R32 teams (global) ─────────────────────────────────────────────────────
// Equipos reales asignados a cada llave de 16avos (73–88). El admin los define.

export type R32TeamsMap = Record<string, { home: string; away: string }>;

export async function getR32Teams(): Promise<R32TeamsMap> {
  try {
    const { rows } = await sql`SELECT * FROM r32_teams`;
    const out: R32TeamsMap = {};
    for (const r of rows) out[String(r.match_id)] = { home: r.home_team, away: r.away_team };
    return out;
  } catch {
    // La tabla puede no existir todavía (antes de correr la migración): no rompas el resto.
    return {};
  }
}

export async function setR32Team(matchId: number, home: string, away: string): Promise<void> {
  await sql`
    INSERT INTO r32_teams (match_id, home_team, away_team)
    VALUES (${matchId}, ${home}, ${away})
    ON CONFLICT (match_id)
    DO UPDATE SET home_team = EXCLUDED.home_team, away_team = EXCLUDED.away_team
  `;
}
