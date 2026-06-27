'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GROUPS, GROUP_MATCHES, getMatchesByGroup, getGroupTeams, getTeamByCode, getMatchById } from '@/lib/matchData';
import { calcMatchPoints, calcGroupPositionPoints, computeKnockoutPoints, resolveBracket, ROUND_RULES, type Side } from '@/lib/scoring';
import { Flag } from '@/components/Flag';
import { BracketLayout, BRACKET } from '@/components/Bracket';

interface UserRow { id: string; username: string; displayName: string; active: boolean; createdAt: string; }
interface SessionUser { username: string; displayName: string; role: string; empresaSlug: string; empresaName: string; }
interface ScorePred { home: number; away: number; winner?: string; }
interface GroupPos { first: string; second: string; third?: string; }
interface ResultEntry { home: number; away: number; played: boolean; locked: boolean; winner?: string; }
interface GroupStanding { first: string; second: string; third?: string; thirdClassified?: boolean; }
interface DetailData {
  predictions: Record<string, ScorePred>;
  groupPredictions: Record<string, GroupPos>;
  results: Record<string, ResultEntry>;
  standings: Record<string, GroupStanding>;
  r32Teams?: Record<string, { home: string; away: string }>;
}

export default function AdminPage() {
  const router = useRouter();

  // ── existing state ──────────────────────────────────────────────────────────
  const [session,   setSession]   = useState<SessionUser | null>(null);
  const [users,     setUsers]     = useState<UserRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [creating,  setCreating]  = useState(false);
  const [createMsg, setCreateMsg] = useState<{ username: string; password: string } | null>(null);
  const [createErr, setCreateErr] = useState('');
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editName,  setEditName]  = useState('');
  const [resetInfo, setResetInfo] = useState<{ username: string; password: string } | null>(null);

  // ── new state ───────────────────────────────────────────────────────────────
  const [activeTab,     setActiveTab]     = useState<'participantes' | 'pollas'>('participantes');
  const [completeness,  setCompleteness]  = useState<Record<string, { scorePredCount: number; groupPredCount: number }>>({});
  const [selectedUser,  setSelectedUser]  = useState<UserRow | null>(null);
  const [detail,        setDetail]        = useState<DetailData | null>(null);
  const [detailGroup,   setDetailGroup]   = useState('A');
  const [detailPhase,   setDetailPhase]   = useState<'grupos' | 'clasificados' | 'eliminatorias'>('grupos');
  const [loadingPollas, setLoadingPollas] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  function token() { return localStorage.getItem('wc26_token') || ''; }

  const fetchUsers = useCallback(async () => {
    const r = await fetch('/api/admin/users', { headers: { 'x-session-token': token() } });
    if (r.ok) { const d = await r.json(); setUsers(d.users || []); }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('wc26_token');
    if (!t) { router.push('/'); return; }
    fetch('/api/auth/me', { headers: { 'x-session-token': t } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.user.role !== 'admin') { router.push('/'); return; }
        setSession(data.user);
        setLoading(false);
        fetchUsers();
      });
  }, [router, fetchUsers]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(''); setCreateMsg(null); setCreating(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'create', firstName: firstName.trim(), lastName: lastName.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) { setCreateMsg({ username: data.username, password: data.password }); setFirstName(''); setLastName(''); fetchUsers(); }
    else setCreateErr(data.error || 'Error al crear usuario');
  }

  async function toggleUser(id: string) {
    await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    fetchUsers();
  }

  async function renameUser(id: string) {
    if (!editName.trim()) return;
    await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'rename', id, displayName: editName.trim() }),
    });
    setEditId(null); fetchUsers();
  }

  async function resetPassword(id: string, username: string) {
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'resetPassword', id }),
    });
    const data = await res.json();
    if (res.ok) setResetInfo({ username, password: data.password });
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-session-token': token() } });
    localStorage.removeItem('wc26_token'); localStorage.removeItem('wc26_user');
    router.push('/');
  }

  function copyAllUsers() {
    const text = users.filter(u => u.active)
      .map(u => `${u.displayName}  |  Usuario: ${u.username}  |  Contraseña: ${session?.empresaSlug}2026`)
      .join('\n');
    navigator.clipboard.writeText(text);
  }

  // ── pollas helpers ──────────────────────────────────────────────────────────
  const fetchCompleteness = useCallback(async () => {
    setLoadingPollas(true);
    const r = await fetch('/api/admin/pollas', { headers: { 'x-session-token': token() } });
    if (r.ok) { const d = await r.json(); setCompleteness(d.completeness || {}); }
    setLoadingPollas(false);
  }, []);

  async function fetchDetail(user: UserRow) {
    setSelectedUser(user);
    setDetail(null);
    setLoadingDetail(true);
    setDetailGroup('A');
    setDetailPhase('grupos');
    const r = await fetch(`/api/admin/pollas?username=${user.username}`, { headers: { 'x-session-token': token() } });
    if (r.ok) { const d = await r.json(); setDetail(d); }
    setLoadingDetail(false);
  }

  function openPollas() {
    setActiveTab('pollas');
    setSelectedUser(null);
    setDetail(null);
    if (Object.keys(completeness).length === 0) fetchCompleteness();
  }

  // ── points for detail view ──────────────────────────────────────────────────
  const totalPts = detail ? (() => {
    let mp = 0, pp = 0;
    for (const [mid, res] of Object.entries(detail.results)) {
      if (!res.played) continue;
      const pred = detail.predictions[mid];
      if (!pred) continue;
      const match = GROUP_MATCHES.find(m => String(m.id) === mid);
      if (!match) continue;
      mp += calcMatchPoints(pred, res, 'group');
    }
    for (const g of GROUPS) {
      const s = detail.standings[g], p = detail.groupPredictions[g];
      if (s && p) pp += calcGroupPositionPoints(p, s);
    }
    const ko = computeKnockoutPoints(
      detail.r32Teams || {},
      detail.results as Record<string, { home: number; away: number; played?: boolean; winner?: 'home' | 'away' }>,
      detail.predictions as Record<string, { home: number; away: number; winner?: 'home' | 'away' }>,
    );
    const matchPts = mp + ko.score;
    return { matchPts, posPts: pp, koPts: ko.advance, total: matchPts + pp + ko.advance };
  })() : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <main className="min-h-screen relative z-10">
      {/* Header */}
      <div className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-black text-white text-sm">⚙️ Admin</div>
            <div className="text-xs text-amber-400">{session?.empresaName}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/leaderboard" className="btn-outline text-xs">🏅 Rankings</Link>
            <Link href="/change-password" className="btn-outline text-xs">🔑 Clave</Link>
            <button onClick={logout} className="btn-outline text-xs text-red-400">Salir</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('participantes')}
            className={`tab-btn ${activeTab === 'participantes' ? 'tab-active' : 'tab-inactive'}`}>
            👥 Participantes
          </button>
          <button onClick={openPollas}
            className={`tab-btn ${activeTab === 'pollas' ? 'tab-active' : 'tab-inactive'}`}>
            📋 Pollas
          </button>
        </div>

        {/* ── PARTICIPANTES ────────────────────────────────────────────────── */}
        {activeTab === 'participantes' && (
          <>
            <div className="glass rounded-2xl p-5">
              <h2 className="font-bold text-white mb-4">Agregar participante</h2>
              <form onSubmit={createUser} className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-32">
                  <label className="text-xs text-amber-400 font-bold block mb-1">Nombre</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Juan"
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <div className="flex-1 min-w-32">
                  <label className="text-xs text-amber-400 font-bold block mb-1">Apellido</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="García"
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <button type="submit" disabled={creating} className="btn-gold text-sm py-2 px-4 shrink-0">
                  {creating ? 'Creando…' : '+ Agregar'}
                </button>
              </form>
              {createErr && <p className="text-red-400 text-sm mt-2">{createErr}</p>}
              {createMsg && (
                <div className="mt-3 glass rounded-xl p-3 border border-emerald-500/30 fade-in">
                  <p className="text-emerald-400 text-xs font-bold mb-1">✓ Usuario creado</p>
                  <p className="text-white text-sm">
                    Usuario: <span className="font-mono text-amber-400">{createMsg.username}</span>
                    &nbsp;·&nbsp;
                    Contraseña: <span className="font-mono text-amber-400">{createMsg.password}</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-1">Comparte estos datos con el participante.</p>
                </div>
              )}
            </div>

            {users.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
                  <h2 className="font-bold text-white text-sm">Participantes ({users.length})</h2>
                  <div className="flex gap-3 items-center">
                    <span className="text-xs text-emerald-400">{users.filter(u => u.active).length} activos</span>
                    <button onClick={copyAllUsers} className="btn-outline text-xs py-1 px-2">📋 Copiar todos</button>
                  </div>
                </div>
                <div className="divide-y divide-white/5 max-h-[55vh] overflow-y-auto">
                  {users.map((u, i) => (
                    <div key={u.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors ${!u.active ? 'opacity-40' : ''}`}>
                      <span className="text-slate-600 text-xs w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        {editId === u.id ? (
                          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); renameUser(u.id); }}>
                            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                              className="flex-1 bg-white/10 border border-amber-400/40 rounded px-2 py-1 text-white text-sm focus:outline-none" />
                            <button type="submit" className="text-emerald-400 text-xs px-2">✓</button>
                            <button type="button" onClick={() => setEditId(null)} className="text-slate-500 text-xs px-2">✕</button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-semibold">{u.displayName}</span>
                            <button onClick={() => { setEditId(u.id); setEditName(u.displayName); }}
                              className="text-slate-600 hover:text-slate-400 text-xs">✏️</button>
                          </div>
                        )}
                        <span className="font-mono text-amber-400 text-xs">{u.username}</span>
                      </div>
                      <button onClick={() => resetPassword(u.id, u.username)} title="Resetear contraseña"
                        className="text-xs px-2 py-1 border border-slate-600/30 rounded text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition-colors">
                        🔑
                      </button>
                      <button onClick={() => toggleUser(u.id)}
                        className={`text-xs px-2 py-1 rounded font-bold border transition-all ${
                          u.active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                            : 'bg-slate-700/30 border-slate-600/30 text-slate-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'}`}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resetInfo && (
              <div className="glass rounded-xl p-4 border border-amber-500/30 fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-amber-400 text-sm font-bold">🔑 Contraseña reseteada</p>
                    <p className="text-white text-sm mt-1">
                      <span className="font-mono">{resetInfo.username}</span> → nueva clave:{' '}
                      <span className="font-mono text-amber-400">{resetInfo.password}</span>
                    </p>
                  </div>
                  <button onClick={() => setResetInfo(null)} className="text-slate-500 hover:text-white text-lg">✕</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── POLLAS ───────────────────────────────────────────────────────── */}
        {activeTab === 'pollas' && (
          <>
            {selectedUser ? (
              /* ── Detail view ── */
              <div className="fade-in flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedUser(null); setDetail(null); }}
                    className="text-amber-400 hover:text-white text-sm transition-colors">← Volver</button>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white truncate">{selectedUser.displayName}</div>
                    <div className="text-xs font-mono text-slate-500">{selectedUser.username}</div>
                  </div>
                  {totalPts !== null && (
                    <div className="glass rounded-xl px-3 py-1.5 text-center shrink-0">
                      <div className="text-xl font-black text-amber-400">{totalPts.total}</div>
                      <div className="text-xs text-slate-500">pts</div>
                    </div>
                  )}
                </div>

                {loadingDetail ? (
                  <div className="text-center py-16 text-slate-500">Cargando...</div>
                ) : detail && (
                  <>
                    {/* Points mini-summary */}
                    {totalPts !== null && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="glass rounded-xl p-3 text-center">
                          <div className="text-lg font-black text-white">{totalPts.matchPts}</div>
                          <div className="text-xs text-slate-500">marcadores</div>
                        </div>
                        <div className="glass rounded-xl p-3 text-center">
                          <div className="text-lg font-black text-white">{totalPts.koPts}</div>
                          <div className="text-xs text-slate-500">mata-mata</div>
                        </div>
                        <div className="glass rounded-xl p-3 text-center">
                          <div className="text-lg font-black text-white">{totalPts.posPts}</div>
                          <div className="text-xs text-slate-500">posiciones</div>
                        </div>
                      </div>
                    )}

                    {/* Phase tabs */}
                    <div className="flex gap-1.5">
                      <button onClick={() => setDetailPhase('grupos')}
                        className={`tab-btn ${detailPhase === 'grupos' ? 'tab-active' : 'tab-inactive'}`}>
                        ⚽ Partidos
                      </button>
                      <button onClick={() => setDetailPhase('clasificados')}
                        className={`tab-btn ${detailPhase === 'clasificados' ? 'tab-active' : 'tab-inactive'}`}>
                        📋 Clasificados
                      </button>
                      <button onClick={() => setDetailPhase('eliminatorias')}
                        className={`tab-btn ${detailPhase === 'eliminatorias' ? 'tab-active' : 'tab-inactive'}`}>
                        🗝️ Mata-mata
                      </button>
                    </div>

                    {/* Partidos */}
                    {detailPhase === 'grupos' && (
                      <div className="fade-in">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {GROUPS.map(g => (
                            <button key={g} onClick={() => setDetailGroup(g)}
                              className={`tab-btn text-sm w-10 ${detailGroup === g ? 'tab-active' : 'tab-inactive'}`}>{g}</button>
                          ))}
                        </div>
                        <div className="glass rounded-2xl overflow-hidden">
                          <div className="border-b border-white/10 px-3 py-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-white">Grupo {detailGroup}</span>
                            <span className="text-xs text-amber-400">4 exacto · 2 resultado</span>
                          </div>
                          {getMatchesByGroup(detailGroup).map(match => {
                            const pred = detail.predictions[String(match.id)];
                            const res  = detail.results[String(match.id)];
                            const pts  = res?.played && pred ? calcMatchPoints(pred, res, 'group') : null;
                            return (
                              <div key={match.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 hover:bg-white/3 text-xs">
                                <span className="text-slate-600 font-mono w-5 shrink-0 text-right">{match.id}</span>
                                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                                  <span className="text-slate-300 truncate">{match.homeTeam.name}</span>
                                  <Flag isoCode={match.homeTeam.isoCode} name={match.homeTeam.name} size={16} />
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5 text-sm font-bold">
                                  <span className={pred ? 'text-white' : 'text-slate-600'}>
                                    {pred ? `${pred.home}–${pred.away}` : '—'}
                                  </span>
                                  {res?.played && (
                                    <>
                                      <span className="text-slate-600 text-xs font-normal">·</span>
                                      <span className="text-amber-400">{res.home}–{res.away}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                  <Flag isoCode={match.awayTeam.isoCode} name={match.awayTeam.name} size={16} />
                                  <span className="text-slate-300 truncate">{match.awayTeam.name}</span>
                                </div>
                                <div className="shrink-0 w-8 text-right">
                                  {pts !== null
                                    ? <span className={`font-bold ${pts === 4 ? 'text-emerald-400' : pts === 2 ? 'text-blue-400' : 'text-slate-600'}`}>+{pts}</span>
                                    : <span className="text-slate-700">—</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Clasificados */}
                    {detailPhase === 'clasificados' && (
                      <div className="glass rounded-2xl overflow-hidden fade-in">
                        <div className="border-b border-white/10 px-3 py-2 flex justify-between items-center">
                          <span className="text-sm font-bold text-white">Clasificados por grupo</span>
                          <span className="text-xs text-amber-400">10 exacto · 5 pos. incorrecta</span>
                        </div>
                        {GROUPS.map(g => {
                          const p     = detail.groupPredictions[g];
                          const s     = detail.standings[g];
                          const teams = getGroupTeams(g);
                          const name  = (code: string) => teams.find(t => t.code === code)?.name ?? code;
                          const iso   = (code: string) => teams.find(t => t.code === code)?.isoCode ?? '';
                          const pts   = p && s ? calcGroupPositionPoints(p, s) : null;
                          return (
                            <div key={g} className="px-3 py-3 border-b border-white/5 hover:bg-white/3">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded flex items-center justify-center font-black text-xs shrink-0 mt-0.5"
                                  style={{ background: 'linear-gradient(135deg,#e63946,#c1121f)' }}>{g}</div>
                                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                                  <div>
                                    <div className="text-slate-500 text-xs mb-1">Pronóstico</div>
                                    {p ? (
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1">
                                          <span className="text-amber-400">🥇</span>
                                          <Flag isoCode={iso(p.first)} name={name(p.first)} size={14} />
                                          <span className="text-white">{name(p.first)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-400">🥈</span>
                                          <Flag isoCode={iso(p.second)} name={name(p.second)} size={14} />
                                          <span className="text-white">{name(p.second)}</span>
                                        </div>
                                        {p.third && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-slate-500">🥉</span>
                                            <Flag isoCode={iso(p.third)} name={name(p.third)} size={14} />
                                            <span className="text-slate-300">{name(p.third)}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : <span className="text-slate-600 italic">Sin pronóstico</span>}
                                  </div>
                                  <div>
                                    <div className="text-slate-500 text-xs mb-1">Real</div>
                                    {s ? (
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1">
                                          <span className="text-amber-400">🥇</span>
                                          <Flag isoCode={iso(s.first)} name={name(s.first)} size={14} />
                                          <span className="text-white">{name(s.first)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-400">🥈</span>
                                          <Flag isoCode={iso(s.second)} name={name(s.second)} size={14} />
                                          <span className="text-white">{name(s.second)}</span>
                                        </div>
                                        {s.third && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-slate-500">🥉</span>
                                            <Flag isoCode={iso(s.third)} name={name(s.third)} size={14} />
                                            <span className={s.thirdClassified ? 'text-emerald-400' : 'text-slate-300'}>{name(s.third)}</span>
                                            {s.thirdClassified && <span className="text-emerald-400 ml-0.5">✓</span>}
                                          </div>
                                        )}
                                      </div>
                                    ) : <span className="text-slate-600">—</span>}
                                  </div>
                                </div>
                                <div className="shrink-0 w-8 text-right">
                                  {pts !== null
                                    ? <span className={`text-sm font-black ${pts > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>+{pts}</span>
                                    : <span className="text-slate-700 text-sm">—</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Mata-mata */}
                    {detailPhase === 'eliminatorias' && (() => {
                      const r32 = detail.r32Teams || {};
                      const predScores = Object.fromEntries(
                        Object.entries(detail.predictions).map(([id, p]) =>
                          [id, { home: p.home, away: p.away, ...(p.winner ? { winner: p.winner as Side } : {}) }]));
                      const realScores = Object.fromEntries(
                        Object.entries(detail.results).filter(([, r]) => r.played).map(([id, r]) =>
                          [id, { home: r.home, away: r.away, ...(r.winner ? { winner: r.winner as Side } : {}) }]));
                      const predB = resolveBracket(r32, predScores);
                      const realB = resolveBracket(r32, realScores);
                      const tName = (c?: string) => (c ? getTeamByCode(c)?.name ?? c : '—');
                      const tIso  = (c?: string) => (c ? getTeamByCode(c)?.isoCode ?? '' : '');
                      if (Object.keys(r32).length === 0)
                        return <div className="glass rounded-2xl p-8 text-center text-slate-500 fade-in text-sm">El bracket aún no está disponible (faltan los equipos de 16avos).</div>;
                      const node = (id: number) => {
                        const m = getMatchById(id)!;
                        const ps = predB[id] || {}, rs = realB[id] || {};
                        const pred = detail.predictions[String(id)];
                        const res  = detail.results[String(id)];
                        const played = res?.played;
                        const advRight = played && rs.adv ? ps.adv === rs.adv : null;
                        const rules = ROUND_RULES[m.round];
                        const scorePts = played && pred && ps.home === rs.home && ps.away === rs.away
                          ? calcMatchPoints({ home: pred.home, away: pred.away }, { home: res!.home, away: res!.away }, m.round) : 0;
                        const advPts = advRight ? (m.round === 'final' ? (rules?.champion ?? 0) : (rules?.classified ?? 0)) : 0;
                        return (
                          <div className="glass rounded-xl p-2 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-600 font-mono text-[10px]">#{id}</span>
                              {advRight !== null && (
                                <span className={`text-[10px] font-bold ${advRight ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {advRight ? `✓ +${advPts + scorePts}` : `✗ +${scorePts}`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <Flag isoCode={tIso(ps.home)} name="" size={13} />
                              <span className="text-slate-300 truncate flex-1">{tName(ps.home)}</span>
                              <span className="text-white font-bold">{pred ? pred.home : '–'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Flag isoCode={tIso(ps.away)} name="" size={13} />
                              <span className="text-slate-300 truncate flex-1">{tName(ps.away)}</span>
                              <span className="text-white font-bold">{pred ? pred.away : '–'}</span>
                            </div>
                            {ps.adv && <div className="text-[10px] text-amber-400/80 mt-0.5">▲ {tName(ps.adv)}</div>}
                            {played && (
                              <div className="mt-1 pt-1 border-t border-white/10 text-[10px] text-slate-500 truncate">
                                Real: {res!.home}–{res!.away}{rs.adv && <span className="text-emerald-400/70"> · {tName(rs.adv)}</span>}
                              </div>
                            )}
                          </div>
                        );
                      };
                      return <BracketLayout nodeWidth={164} renderNode={node} thirdNode={node(BRACKET.third)} />;
                    })()}
                  </>
                )}
              </div>
            ) : (
              /* ── Completeness list ── */
              <div className="fade-in flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Toca un participante para ver su polla completa.</p>
                  <button onClick={fetchCompleteness} className="btn-outline text-xs py-1 px-2">↻ Actualizar</button>
                </div>

                {loadingPollas ? (
                  <div className="text-center py-16 text-slate-500">Cargando...</div>
                ) : users.filter(u => u.active).length === 0 ? (
                  <div className="glass rounded-2xl p-8 text-center text-slate-500">
                    <div className="text-3xl mb-2">👥</div>
                    <p>Aún no hay participantes activos.</p>
                  </div>
                ) : (
                  <div className="glass rounded-2xl overflow-hidden">
                    <div className="border-b border-white/10 px-4 py-2 grid grid-cols-[1fr_4.5rem_4.5rem_5.5rem_1.5rem] gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                      <span>Participante</span>
                      <span className="text-center">Partidos</span>
                      <span className="text-center">Grupos</span>
                      <span className="text-center">Estado</span>
                      <span />
                    </div>
                    {users.filter(u => u.active).map(u => {
                      const c    = completeness[u.username] ?? { scorePredCount: 0, groupPredCount: 0 };
                      const full  = c.scorePredCount === 72 && c.groupPredCount === 12;
                      const empty = c.scorePredCount === 0  && c.groupPredCount === 0;
                      return (
                        <button key={u.id} onClick={() => fetchDetail(u)}
                          className="w-full grid grid-cols-[1fr_4.5rem_4.5rem_5.5rem_1.5rem] gap-2 items-center px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-left">
                          <div className="min-w-0">
                            <div className="text-white text-sm font-semibold truncate">{u.displayName}</div>
                          </div>
                          <div className={`text-sm font-bold text-center ${c.scorePredCount === 72 ? 'text-emerald-400' : c.scorePredCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {c.scorePredCount}/72
                          </div>
                          <div className={`text-sm font-bold text-center ${c.groupPredCount === 12 ? 'text-emerald-400' : c.groupPredCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {c.groupPredCount}/12
                          </div>
                          <div className="text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              full  ? 'bg-emerald-500/20 text-emerald-400' :
                              empty ? 'bg-red-500/15 text-red-400' :
                                      'bg-amber-500/15 text-amber-400'}`}>
                              {full ? '✓ Completa' : empty ? '✗ Vacía' : '~ Parcial'}
                            </span>
                          </div>
                          <span className="text-slate-500 text-sm text-center">→</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
