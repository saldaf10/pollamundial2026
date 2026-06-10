'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GROUPS, KNOCKOUT_ROUNDS, getMatchesByGroup, getGroupTeams, type Match } from '@/lib/matchData';
import { Flag } from '@/components/Flag';
import { ROUND_RULES, type Side } from '@/lib/scoring';

interface ResultEntry { home: number; away: number; played: boolean; locked: boolean; winner?: Side; }
interface GroupPos    { first: string; second: string; third?: string; thirdClassified?: boolean; }
interface EmpresaRecord {
  id: string; slug: string; name: string; createdAt: string;
  adminUser?: { username: string; password: string; active: boolean };
}

function AdminMatchRow({ match, result, token, onUpdate, isKnockout }: {
  match: Match; result?: ResultEntry; token: string; onUpdate: () => void; isKnockout: boolean;
}) {
  const [h, setH] = useState(String(result?.home ?? ''));
  const [a, setA] = useState(String(result?.away ?? ''));
  const [w, setW] = useState<Side | undefined>(result?.winner);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { setH(String(result?.home ?? '')); setA(String(result?.away ?? '')); setW(result?.winner); }, [result]);

  async function save() {
    setSaving(true);
    const hn = parseInt(h), an = parseInt(a);
    if (isNaN(hn) || isNaN(an)) { setSaving(false); return; }
    const body: Record<string, unknown> = { matchId: match.id, home: hn, away: an };
    if (isKnockout) body.winner = hn === an ? w : (hn > an ? 'home' : 'away');
    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { setMsg('✓'); onUpdate(); setTimeout(() => setMsg(''), 1500); } else setMsg('Error');
  }

  async function toggleLock() {
    setSaving(true);
    await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: JSON.stringify({ matchId: match.id, locked: !result?.locked }),
    });
    setSaving(false); onUpdate();
  }

  const isDraw = parseInt(h) === parseInt(a) && h !== '' && a !== '';
  return (
    <div className={`flex flex-col gap-2 py-3 px-3 border-b border-white/5 ${result?.played ? 'bg-white/3' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600 font-mono w-6 text-right">{match.id}</span>
        <Flag isoCode={match.homeTeam.isoCode} name={match.homeTeam.name} size={20} />
        <span className="text-xs text-slate-300 flex-1 truncate">{match.homeTeam.name}</span>
        <div className="flex items-center gap-1.5">
          <input type="number" min={0} max={20} value={h} onChange={e => setH(e.target.value)}
            className="w-10 h-8 bg-white/10 border border-white/15 rounded text-white text-center text-sm font-bold focus:outline-none focus:border-amber-400" />
          <span className="text-slate-600 text-xs">–</span>
          <input type="number" min={0} max={20} value={a} onChange={e => setA(e.target.value)}
            className="w-10 h-8 bg-white/10 border border-white/15 rounded text-white text-center text-sm font-bold focus:outline-none focus:border-amber-400" />
        </div>
        <span className="text-xs text-slate-300 flex-1 truncate">{match.awayTeam.name}</span>
        <Flag isoCode={match.awayTeam.isoCode} name={match.awayTeam.name} size={20} />
        <button onClick={save} disabled={saving || h === '' || a === ''}
          className={`text-xs px-2 py-1 rounded font-bold transition-all border ${
            msg === '✓' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
            msg === 'Error' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
            'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'}`}>
          {saving ? '…' : msg || 'OK'}
        </button>
        <button onClick={toggleLock} disabled={saving}
          className={`text-lg transition-opacity ${result?.locked ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}>
          {result?.locked ? '🔒' : '🔓'}
        </button>
      </div>
      {isKnockout && isDraw && h !== '' && a !== '' && (
        <div className="flex items-center gap-2 pl-8">
          <span className="text-xs text-amber-400">Ganador:</span>
          {(['home', 'away'] as Side[]).map(side => (
            <button key={side} onClick={() => setW(side)}
              className={`px-2 py-0.5 rounded text-xs font-bold border transition-all ${
                w === side ? 'bg-amber-500/20 border-amber-400/60 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
              {side === 'home' ? match.homeTeam.name : match.awayTeam.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StandingsRow({ group, teams, standing, token, onUpdate }: {
  group: string; teams: { code: string; name: string; isoCode: string }[];
  standing?: GroupPos; token: string; onUpdate: () => void;
}) {
  const [first,  setFirst]  = useState(standing?.first  || '');
  const [second, setSecond] = useState(standing?.second || '');
  const [third,  setThird]  = useState(standing?.third  || '');
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  useEffect(() => {
    setFirst(standing?.first || ''); setSecond(standing?.second || '');
    setThird(standing?.third || '');
  }, [standing]);

  async function save() {
    if (!first || !second || first === second) return;
    setSaving(true);
    // Preserva thirdClassified existente salvo que se cambie el equipo 3°
    const tc = third !== (standing?.third ?? '') ? false : (standing?.thirdClassified ?? false);
    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: JSON.stringify({ type: 'group_standing', group, first, second, third: third || null, thirdClassified: tc }),
    });
    setSaving(false);
    if (res.ok) { setMsg('✓'); onUpdate(); setTimeout(() => setMsg(''), 1500); }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 border-b border-white/5 hover:bg-white/3">
      <div className="w-6 h-6 rounded flex items-center justify-center font-black text-xs shrink-0"
        style={{ background: 'linear-gradient(135deg,#e63946,#c1121f)' }}>{group}</div>
      <div className="flex-1 flex gap-2">
        <select value={first} onChange={e => setFirst(e.target.value)}
          className="flex-1 border border-white/15 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
          style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
          <option value="">1° —</option>
          {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === second || t.code === third}>{t.name}</option>)}
        </select>
        <select value={second} onChange={e => setSecond(e.target.value)}
          className="flex-1 border border-white/15 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
          style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
          <option value="">2° —</option>
          {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === first || t.code === third}>{t.name}</option>)}
        </select>
        <select value={third} onChange={e => setThird(e.target.value)}
          className="flex-1 border border-white/15 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-400"
          style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
          <option value="">3° —</option>
          {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === first || t.code === second}>{t.name}</option>)}
        </select>
      </div>
      <button onClick={save} disabled={saving || !first || !second || first === second}
        className={`text-xs px-2 py-1 rounded font-bold border transition-all shrink-0 ${
          msg === '✓' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'}`}>
        {saving ? '…' : msg || 'OK'}
      </button>
    </div>
  );
}

function BestThirdsPanel({ standings, token, onUpdate }: {
  standings: Record<string, GroupPos>;
  token: string;
  onUpdate: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const classifiedCount = GROUPS.filter(g => standings[g]?.thirdClassified).length;

  async function toggle(group: string) {
    if (!standings[group]?.third || saving) return;
    setSaving(group);
    await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: JSON.stringify({ type: 'set_third_classified', group, thirdClassified: !standings[group].thirdClassified }),
    });
    setSaving(null);
    onUpdate();
  }

  return (
    <div className="glass rounded-2xl p-4 mt-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-white text-sm">🥉 Mejores Terceros clasificados</h3>
        <span className={`font-black text-sm ${classifiedCount === 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {classifiedCount} / 8
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Toca un grupo para marcar o desmarcar su tercero como clasificado (otorga 10 pts a quienes lo acertaron). El equipo debe estar registrado como 3° arriba.
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {GROUPS.map(g => {
          const s = standings[g];
          const teams = getGroupTeams(g);
          const team = s?.third ? teams.find(t => t.code === s.third) : undefined;
          const classified = !!s?.thirdClassified;
          return (
            <button key={g} onClick={() => toggle(g)} disabled={!team || saving === g}
              className={`rounded-xl p-2.5 border text-center transition-all ${
                classified
                  ? 'bg-emerald-500/15 border-emerald-500/50'
                  : team
                  ? 'bg-white/5 border-white/10 hover:border-white/30'
                  : 'bg-white/3 border-white/5 opacity-30 cursor-not-allowed'
              }`}>
              <div className="text-xs font-black text-slate-400 mb-1">{g}</div>
              {team ? (
                <>
                  <div className="flex justify-center mb-1">
                    <Flag isoCode={team.isoCode} name={team.name} size={20} />
                  </div>
                  <div className={`leading-tight text-xs font-semibold ${classified ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {team.name.length > 11 ? team.name.slice(0, 11) + '…' : team.name}
                  </div>
                  {classified && <div className="text-emerald-400 mt-0.5" style={{ fontSize: 10 }}>✓ clasifica</div>}
                </>
              ) : (
                <div className="text-slate-600 text-xs mt-2">Sin 3°</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<'empresas' | 'resultados' | 'clasificaciones'>('empresas');
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([]);
  const [newName,  setNewName]  = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ slug: string; adminUsername: string } | null>(null);
  const [createErr,setCreateErr] = useState('');
  const [editEmp,  setEditEmp]  = useState<EmpresaRecord | null>(null);
  const [showPw,   setShowPw]   = useState<string | null>(null);
  const [resPhase, setResPhase] = useState<'grupos' | string>('grupos');
  const [resGroup, setResGroup] = useState('A');
  const [results,  setResults]  = useState<Record<string, ResultEntry>>({});
  const [standings,setStandings]= useState<Record<string, GroupPos>>({});

  const fetchResults = useCallback(async () => {
    const r = await fetch('/api/results');
    if (r.ok) { const d = await r.json(); setResults(d.results || {}); setStandings(d.standings || {}); }
  }, []);

  const fetchEmpresas = useCallback(async (t: string) => {
    const r = await fetch('/api/superadmin/empresas', { headers: { 'x-session-token': t } });
    if (r.ok) { const d = await r.json(); setEmpresas(d.empresas || []); }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('wc26_token') || '';
    if (!t) { router.push('/'); return; }
    fetch('/api/auth/me', { headers: { 'x-session-token': t } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.user.role !== 'superadmin') { router.push('/'); return; }
        setSessionToken(t);
        setLoading(false);
        fetchEmpresas(t);
        fetchResults();
      });
  }, [router, fetchEmpresas, fetchResults]);

  async function createEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(''); setCreateResult(null); setCreating(true);
    const res = await fetch('/api/superadmin/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ action: 'create', name: newName.trim(), adminPassword: newPw }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) { setCreateResult(data); setNewName(''); setNewPw(''); fetchEmpresas(sessionToken); }
    else setCreateErr(data.error || 'Error al crear');
  }

  async function deleteEmpresa(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}" y todos sus usuarios?`)) return;
    await fetch('/api/superadmin/empresas', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchEmpresas(sessionToken);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editEmp) return;
    await fetch('/api/superadmin/empresas', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({ action: 'update', id: editEmp.id, name: editEmp.name, adminPassword: editEmp.adminUser?.password }),
    });
    setEditEmp(null); fetchEmpresas(sessionToken);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-session-token': sessionToken } });
    localStorage.removeItem('wc26_token'); localStorage.removeItem('wc26_user');
    router.push('/');
  }

  const koRound = KNOCKOUT_ROUNDS.find(r => r.key === resPhase);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <main className="min-h-screen relative z-10">
      <div className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-black text-amber-400 text-lg">🏆 WC26</div>
          <h1 className="font-black text-white">🛡️ Super Admin</h1>
          <div className="flex gap-2">
            <Link href="/change-password" className="btn-outline text-xs">🔑 Clave</Link>
            <button onClick={logout} className="btn-outline text-xs text-red-400">Salir</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'empresas'        as const, label: `🏢 Empresas (${empresas.length})` },
            { key: 'resultados'      as const, label: '⚽ Resultados' },
            { key: 'clasificaciones' as const, label: '📋 Clasificaciones' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`tab-btn ${tab === t.key ? 'tab-active' : 'tab-inactive'}`}>{t.label}</button>
          ))}
        </div>

        {/* ─── EMPRESAS ─── */}
        {tab === 'empresas' && (
          <div className="fade-in flex flex-col gap-4">
            <div className="glass rounded-2xl p-5">
              <h2 className="font-bold text-white mb-4">Crear nueva empresa</h2>
              <form onSubmit={createEmpresa} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-amber-400 font-bold block mb-1">Nombre de la empresa</label>
                    <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ej: Colegio Fontán"
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-amber-400 font-bold block mb-1">Contraseña del admin</label>
                    <input value={newPw} onChange={e => setNewPw(e.target.value)} required placeholder="Contraseña para su admin"
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                </div>
                {createErr && <p className="text-red-400 text-sm">{createErr}</p>}
                <button type="submit" disabled={creating} className="btn-gold text-sm py-2 px-5 self-start">
                  {creating ? 'Creando…' : '+ Crear empresa'}
                </button>
              </form>
              {createResult && (
                <div className="mt-3 glass rounded-xl p-3 border border-emerald-500/30 fade-in">
                  <p className="text-emerald-400 text-xs font-bold mb-1">✓ Empresa creada</p>
                  <p className="text-white text-sm">
                    Admin usuario: <span className="font-mono text-amber-400">{createResult.adminUsername}</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">El admin ingresa por la misma pantalla de login.</p>
                </div>
              )}
            </div>

            {empresas.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-slate-500">
                <div className="text-3xl mb-2">🏢</div>
                <p>Aún no hay empresas. Crea la primera arriba.</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="border-b border-white/10 px-4 py-3">
                  <h2 className="font-bold text-white text-sm">Empresas registradas</h2>
                </div>
                <div className="divide-y divide-white/5">
                  {empresas.map(emp => (
                    <div key={emp.id} className="px-4 py-3 hover:bg-white/3 transition-colors">
                      {editEmp?.id === emp.id ? (
                        <form onSubmit={saveEdit} className="flex gap-2 items-center flex-wrap">
                          <input autoFocus value={editEmp.name} onChange={e => setEditEmp({ ...editEmp, name: e.target.value })}
                            className="flex-1 min-w-32 bg-white/10 border border-amber-400/40 rounded px-2 py-1 text-white text-sm focus:outline-none" />
                          <input
                            value={editEmp.adminUser?.password || ''}
                            onChange={e => setEditEmp({ ...editEmp, adminUser: { ...editEmp.adminUser!, password: e.target.value } })}
                            placeholder="Nueva clave admin"
                            className="flex-1 min-w-32 bg-white/10 border border-amber-400/40 rounded px-2 py-1 text-white text-sm focus:outline-none" />
                          <button type="submit" className="text-emerald-400 text-xs px-3 py-1 border border-emerald-500/30 rounded">Guardar</button>
                          <button type="button" onClick={() => setEditEmp(null)} className="text-slate-500 text-xs px-2 py-1">✕</button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm">{emp.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                              <span>Admin: <span className="font-mono text-amber-400">{emp.adminUser?.username}</span></span>
                              <span>Clave: <span className="font-mono">{showPw === emp.id ? emp.adminUser?.password : '••••••'}</span>
                                <button onClick={() => setShowPw(showPw === emp.id ? null : emp.id)}
                                  className="ml-1 text-slate-600 hover:text-slate-400 text-xs">{showPw === emp.id ? 'ocultar' : 'ver'}</button>
                              </span>
                              <span className="text-slate-600">{new Date(emp.createdAt).toLocaleDateString('es-CO')}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => setEditEmp(emp)}
                              className="text-xs px-2 py-1 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/10">✏️ Editar</button>
                            <button onClick={() => deleteEmpresa(emp.id, emp.name)}
                              className="text-xs px-2 py-1 border border-red-500/30 rounded text-red-400 hover:bg-red-500/10">🗑️</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── RESULTADOS ─── */}
        {tab === 'resultados' && (
          <div className="fade-in">
            <div className="glass rounded-xl p-4 mb-4 text-xs text-slate-400">
              Al guardar un resultado se <strong className="text-amber-400">bloquea automáticamente</strong> — los participantes ya no pueden cambiar su pronóstico.
              Usa <strong className="text-amber-400">🔒</strong> para pre-bloquear un partido antes de ingresarlo. Aplica a <strong>todas las empresas</strong>.
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button onClick={() => setResPhase('grupos')} className={`tab-btn ${resPhase === 'grupos' ? 'tab-active' : 'tab-inactive'}`}>Grupos</button>
              {KNOCKOUT_ROUNDS.map(r => (
                <button key={r.key} onClick={() => setResPhase(r.key)} className={`tab-btn ${resPhase === r.key ? 'tab-active' : 'tab-inactive'}`}>{r.label}</button>
              ))}
            </div>
            {resPhase === 'grupos' && (
              <>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {GROUPS.map(g => (
                    <button key={g} onClick={() => setResGroup(g)}
                      className={`tab-btn text-sm w-10 ${resGroup === g ? 'tab-active' : 'tab-inactive'}`}>{g}</button>
                  ))}
                </div>
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="border-b border-white/10 px-3 py-2 flex justify-between items-center">
                    <h2 className="font-bold text-white text-sm">Grupo {resGroup}</h2>
                    <span className="text-xs text-amber-400">4 exacto · 2 resultado</span>
                  </div>
                  {getMatchesByGroup(resGroup).map(match => (
                    <AdminMatchRow key={match.id} match={match} result={results[String(match.id)]}
                      token={sessionToken} onUpdate={fetchResults} isKnockout={false} />
                  ))}
                </div>
              </>
            )}
            {koRound && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="border-b border-white/10 px-3 py-2 flex justify-between items-center">
                  <h2 className="font-bold text-white text-sm">{koRound.label}</h2>
                  <span className="text-xs text-amber-400">
                    {ROUND_RULES[koRound.key]?.exact} exacto · {ROUND_RULES[koRound.key]?.result} resultado
                    {koRound.key === 'final' ? ' · 50 campeón · 40 sub' : ` · ${ROUND_RULES[koRound.key]?.classified} clasif.`}
                  </span>
                </div>
                {koRound.matches.map(match => (
                  <AdminMatchRow key={match.id} match={match} result={results[String(match.id)]}
                    token={sessionToken} onUpdate={fetchResults} isKnockout={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── CLASIFICACIONES ─── */}
        {tab === 'clasificaciones' && (
          <div className="fade-in">
            <div className="glass rounded-xl p-4 mb-4 text-xs text-slate-400">
              <strong className="text-amber-400">1°, 2° y 3°</strong> de cada grupo. Aplica a todas las empresas.
              <span className="text-emerald-400 font-bold ml-2">10 pts</span> exacto ·
              <span className="text-blue-400 font-bold ml-1">5 pts</span> posición incorrecta.
              Para el 3°: marca <strong className="text-emerald-400">"Clasifica"</strong> si ese equipo avanzó como mejor tercero (<strong className="text-emerald-400">10 pts</strong>); si no clasifica, <strong className="text-slate-400">0 pts</strong>.
            </div>
            <div className="glass rounded-2xl overflow-hidden">
              {GROUPS.map(g => (
                <StandingsRow key={g} group={g} teams={getGroupTeams(g)}
                  standing={standings[g]} token={sessionToken} onUpdate={fetchResults} />
              ))}
            </div>
            <BestThirdsPanel standings={standings} token={sessionToken} onUpdate={fetchResults} />
          </div>
        )}
      </div>
    </main>
  );
}
