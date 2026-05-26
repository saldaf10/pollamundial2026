import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR     = path.join(process.cwd(), 'data');
const EMPRESAS_DIR = path.join(DATA_DIR, 'empresas');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) as T; }
  catch { return fallback; }
}

function writeJSON(file: string, data: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function ep(slug: string, file: string): string {
  return path.join(EMPRESAS_DIR, slug, file);
}

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
}

export type ScorePredMap = Record<string, Record<string, ScorePrediction>>;
export type GroupPredMap = Record<string, Record<string, GroupPosition>>;
export type ResultsMap   = Record<string, ResultEntry>;
export type StandingsMap = Record<string, GroupPosition>;

// ─── Bootstrap (crea superadmin si no existe) ─────────────────────────────────

export function bootstrap(): void {
  const users = getUsers();
  if (!users.some(u => u.role === 'superadmin')) {
    addUser({
      id: randomUUID(),
      username: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin2026',
      displayName: 'Super Admin',
      role: 'superadmin',
      empresaSlug: '',
      active: true,
      createdAt: new Date().toISOString(),
    });
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

const USERS_FILE = path.join(DATA_DIR, 'users.json');

export function getUsers(): User[]                                        { return readJSON<User[]>(USERS_FILE, []); }
export function getUserByUsername(username: string): User | undefined     { return getUsers().find(u => u.username === username); }
export function getUserById(id: string): User | undefined                 { return getUsers().find(u => u.id === id); }
export function getUsersByEmpresa(slug: string): User[]                   { return getUsers().filter(u => u.empresaSlug === slug); }
export function saveUsers(users: User[]): void                            { writeJSON(USERS_FILE, users); }

export function addUser(user: User): void {
  const all = getUsers(); all.push(user); saveUsers(all);
}

export function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): boolean {
  const all = getUsers();
  const idx = all.findIndex(u => u.id === id);
  if (idx < 0) return false;
  Object.assign(all[idx], updates);
  saveUsers(all);
  return true;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

export function getSessions(): SessionRecord[]                             { return readJSON<SessionRecord[]>(SESSIONS_FILE, []); }
export function getSession(token: string): SessionRecord | undefined       { return getSessions().find(s => s.token === token); }

export function addSession(session: SessionRecord): void {
  const all = getSessions(); all.push(session);
  // Limpiar sesiones viejas (más de 30 días)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cleaned = all.filter(s => s.createdAt > cutoff);
  writeJSON(SESSIONS_FILE, cleaned);
}

export function removeSession(token: string): void {
  const all = getSessions().filter(s => s.token !== token);
  writeJSON(SESSIONS_FILE, all);
}

// ─── Empresas ─────────────────────────────────────────────────────────────────

const EMPRESAS_FILE = path.join(DATA_DIR, 'empresas.json');

export function getEmpresas(): Empresa[]                                  { return readJSON<Empresa[]>(EMPRESAS_FILE, []); }
export function getEmpresa(slug: string): Empresa | undefined             { return getEmpresas().find(e => e.slug === slug); }
export function saveEmpresas(list: Empresa[]): void                       { writeJSON(EMPRESAS_FILE, list); }
export function addEmpresa(e: Empresa): void                              { const all = getEmpresas(); all.push(e); saveEmpresas(all); }

// ─── Score Predictions (empresa-scoped, keyed by username) ───────────────────

export function getAllScorePredictions(slug: string): ScorePredMap        { return readJSON<ScorePredMap>(ep(slug, 'predictions.json'), {}); }
export function getScorePredictions(slug: string, username: string): Record<string, ScorePrediction> {
  return getAllScorePredictions(slug)[username] || {};
}
export function saveScorePrediction(slug: string, username: string, matchId: number, pred: ScorePrediction): void {
  const all = getAllScorePredictions(slug);
  if (!all[username]) all[username] = {};
  all[username][String(matchId)] = pred;
  writeJSON(ep(slug, 'predictions.json'), all);
}

// ─── Group Position Predictions (empresa-scoped, keyed by username) ──────────

export function getAllGroupPredictions(slug: string): GroupPredMap        { return readJSON<GroupPredMap>(ep(slug, 'group_preds.json'), {}); }
export function getGroupPredictions(slug: string, username: string): Record<string, GroupPosition> {
  return getAllGroupPredictions(slug)[username] || {};
}
export function saveGroupPrediction(slug: string, username: string, group: string, pos: GroupPosition): void {
  const all = getAllGroupPredictions(slug);
  if (!all[username]) all[username] = {};
  all[username][group] = pos;
  writeJSON(ep(slug, 'group_preds.json'), all);
}

// ─── Results (global) ─────────────────────────────────────────────────────────

export function getResults(): ResultsMap                                   { return readJSON<ResultsMap>(path.join(DATA_DIR, 'results.json'), {}); }
export function setMatchResult(matchId: number, home: number, away: number, winner?: 'home' | 'away'): void {
  const r = getResults();
  r[String(matchId)] = { home, away, played: true, locked: r[String(matchId)]?.locked ?? false, ...(winner ? { winner } : {}) };
  writeJSON(path.join(DATA_DIR, 'results.json'), r);
}
export function setMatchLocked(matchId: number, locked: boolean): void {
  const r = getResults();
  r[String(matchId)] = { ...(r[String(matchId)] || { home: 0, away: 0, played: false }), locked };
  writeJSON(path.join(DATA_DIR, 'results.json'), r);
}

// ─── Group Standings (global) ─────────────────────────────────────────────────

export function getGroupStandings(): StandingsMap                          { return readJSON<StandingsMap>(path.join(DATA_DIR, 'group_standings.json'), {}); }
export function setGroupStanding(group: string, first: string, second: string): void {
  const s = getGroupStandings(); s[group] = { first, second }; writeJSON(path.join(DATA_DIR, 'group_standings.json'), s);
}

// ─── Session helper (para rutas API) ─────────────────────────────────────────

export function getSessionFromRequest(headers: Headers): SessionRecord | null {
  const token = headers.get('x-session-token');
  if (!token) return null;
  return getSession(token) ?? null;
}
