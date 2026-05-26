'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GROUPS, ALL_MATCHES, getMatchesByGroup, getGroupTeams, type Match, type Team,
} from '@/lib/matchData';
import { calcMatchPoints, calcClassifiedPoints, calcGroupPositionPoints, ROUND_RULES, derivedWinner, type Side } from '@/lib/scoring';
import { PREDICTIONS_DEADLINE_ISO } from '@/lib/config';
import { Flag } from '@/components/Flag';

interface ResultEntry { home: number; away: number; played: boolean; locked: boolean; winner?: Side; }
interface ScorePred   { home: number; away: number; winner?: Side; }
interface GroupPos    { first: string; second: string; }
interface SessionUser { username: string; displayName: string; role: string; empresaSlug: string; empresaName: string; }

function PtsBadge({ pts, max }: { pts: number; max: number }) {
  if (pts === max) return <span className="badge-exact text-xs font-bold px-2 py-0.5 rounded-full">+{pts} exacto</span>;
  if (pts > 0)    return <span className="badge-result text-xs font-bold px-2 py-0.5 rounded-full">+{pts} pts</span>;
  return <span className="badge-miss text-xs font-bold px-2 py-0.5 rounded-full">0 pts</span>;
}

function MatchCard({ match, prediction, result, onSave, saving, isKnockout, closed }: {
  match: Match; prediction?: ScorePred; result?: ResultEntry;
  onSave: (id: number, h: number, a: number, w?: Side) => void;
  saving: boolean; isKnockout: boolean; closed: boolean;
}) {
  const [h, setH] = useState(String(prediction?.home ?? ''));
  const [a, setA] = useState(String(prediction?.away ?? ''));
  const [w, setW] = useState<Side | undefined>(prediction?.winner);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setH(String(prediction?.home ?? '')); setA(String(prediction?.away ?? '')); setW(prediction?.winner); }, [prediction]);
  useEffect(() => {
    const hn = parseInt(h), an = parseInt(a);
    if (!isNaN(hn) && !isNaN(an)) { const dw = derivedWinner({ home: hn, away: an }); if (dw) setW(dw); }
  }, [h, a, isKnockout]);

  const isLocked = closed || result?.locked;
  const isPlayed = result?.played;
  const rules    = ROUND_RULES[match.round];
  const maxPts   = rules?.exact ?? 4;
  const matchPts = isPlayed && prediction && result ? calcMatchPoints(prediction, result, match.round) : null;
  const classPts = isPlayed && prediction && result && isKnockout
    ? calcClassifiedPoints(prediction, w ?? null, result, result.winner ?? null, match.round) : null;

  function handleSave() {
    const hn = parseInt(h), an = parseInt(a);
    if (isNaN(hn) || isNaN(an)) return;
    onSave(match.id, hn, an, isKnockout ? w : undefined);
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }
  const isDraw = parseInt(h) === parseInt(a) && h !== '' && a !== '';
  return (
    <div className={`match-card p-4 ${isLocked ? 'locked' : ''}`}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-slate-600 font-mono">#{match.id}</span>
        <span className="text-xs text-slate-600">· {match.date} · {match.venue}</span>
        {result?.locked && !closed && <span className="ml-auto text-xs text-amber-500">🔒 Cerrado</span>}
        {isPlayed && matchPts !== null && (
          <span className="ml-auto flex gap-1.5 items-center">
            {classPts !== null && classPts > 0 && <span className="badge-exact text-xs font-bold px-2 py-0.5 rounded-full">+{classPts} clasif.</span>}
            <PtsBadge pts={matchPts} max={maxPts} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-right text-sm font-semibold text-white">{match.homeTeam.name}</span>
          <Flag isoCode={match.homeTeam.isoCode} name={match.homeTeam.name} size={28} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input type="number" min={0} max={20} value={h} onChange={e => setH(e.target.value)}
            disabled={!!isLocked || saving} className="score-input" />
          <span className="text-slate-500 font-bold">–</span>
          <input type="number" min={0} max={20} value={a} onChange={e => setA(e.target.value)}
            disabled={!!isLocked || saving} className="score-input" />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Flag isoCode={match.awayTeam.isoCode} name={match.awayTeam.name} size={28} />
          <span className="text-sm font-semibold text-white">{match.awayTeam.name}</span>
        </div>
        {!isLocked && (
          <button onClick={handleSave} disabled={saving || h === '' || a === ''}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              saved ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'}`}>
            {saved ? '✓' : 'OK'}
          </button>
        )}
        {isPlayed && result && (
          <div className="shrink-0 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Real</div>
            <div className="text-sm font-bold text-white">{result.home}–{result.away}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupPosCard({ group, teams, prediction, standing, onSave, closed }: {
  group: string; teams: Team[]; prediction?: GroupPos; standing?: GroupPos;
  onSave: (g: string, first: string, second: string) => void; closed: boolean;
}) {
  const [first, setFirst]   = useState(prediction?.first || '');
  const [second, setSecond] = useState(prediction?.second || '');
  const [saved, setSaved]   = useState(false);
  useEffect(() => { setFirst(prediction?.first || ''); setSecond(prediction?.second || ''); }, [prediction]);
  const pts = standing && prediction ? calcGroupPositionPoints(prediction, standing) : null;
  function save() {
    if (!first || !second || first === second || closed) return;
    onSave(group, first, second);
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }
  return (
    <div className={`match-card p-4 ${closed ? 'locked' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded flex items-center justify-center font-black text-xs"
          style={{ background: 'linear-gradient(135deg,#e63946,#c1121f)' }}>{group}</div>
        <span className="text-sm font-bold text-white">Grupo {group}</span>
        {pts !== null && <span className="ml-auto"><PtsBadge pts={pts} max={20} /></span>}
        {standing && (
          <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
            Real:&nbsp;
            <Flag isoCode={teams.find(t => t.code === standing.first)?.isoCode ?? ''} name="" size={16} />
            <Flag isoCode={teams.find(t => t.code === standing.second)?.isoCode ?? ''} name="" size={16} />
          </span>
        )}
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-amber-400 font-bold block mb-1">🥇 1° Clasificado</label>
          <select value={first} onChange={e => setFirst(e.target.value)} disabled={closed}
            className="w-full border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 disabled:opacity-50"
            style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
            <option value="">— Elegir —</option>
            {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === second}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-400 font-bold block mb-1">🥈 2° Clasificado</label>
          <select value={second} onChange={e => setSecond(e.target.value)} disabled={closed}
            className="w-full border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 disabled:opacity-50"
            style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
            <option value="">— Elegir —</option>
            {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === first}>{t.name}</option>)}
          </select>
        </div>
        {!closed && (
          <button onClick={save} disabled={!first || !second || first === second}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border shrink-0 ${
              saved ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'}`}>
            {saved ? '✓' : 'Guardar'}
          </button>
        )}
      </div>
    </div>
  );
}

function DeadlineBanner({ closed, countdown }: { closed: boolean; countdown: string }) {
  if (closed) {
    return (
      <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3 text-sm fade-in"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <span className="text-xl">🔒</span>
        <div>
          <div className="font-bold text-red-400">Pronósticos cerrados</div>
          <div className="text-xs text-slate-400">El mundial comenzó el 11 de junio. Ya no puedes modificar tu polla.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3 text-sm fade-in"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
      <span className="text-xl">⏳</span>
      <div>
        <div className="font-bold text-amber-400">Pronósticos abiertos</div>
        <div className="text-xs text-slate-400">Cierre: <strong className="text-white">11 de junio 2026 · 12:00 a.m. (hora Colombia)</strong>{countdown ? ` · Faltan ${countdown}` : ''}</div>
      </div>
    </div>
  );
}

function PredictContent() {
  const router = useRouter();
  const [session,   setSession]   = useState<SessionUser | null>(null);
  const [phase,     setPhase]     = useState<'grupos' | 'clasificados'>('grupos');
  const [group,     setGroup]     = useState('A');
  const [preds,     setPreds]     = useState<Record<string, ScorePred>>({});
  const [gPreds,    setGPreds]    = useState<Record<string, GroupPos>>({});
  const [results,   setResults]   = useState<Record<string, ResultEntry>>({});
  const [standings, setStandings] = useState<Record<string, GroupPos>>({});
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [countdown, setCountdown] = useState('');
  const [isClosed,  setIsClosed]  = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function token() { return localStorage.getItem('wc26_token') || ''; }

  const fetchData = useCallback(async () => {
    const [p, r] = await Promise.all([
      fetch('/api/predictions', { headers: { 'x-session-token': token() } }),
      fetch('/api/results'),
    ]);
    if (p.ok) { const d = await p.json(); setPreds(d.predictions || {}); setGPreds(d.groupPredictions || {}); }
    if (r.ok) { const d = await r.json(); setResults(d.results || {}); setStandings(d.standings || {}); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const deadline = new Date(PREDICTIONS_DEADLINE_ISO);
    function tick() {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) {
        setIsClosed(true);
        setCountdown('');
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setIsClosed(false);
      const days  = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins  = Math.floor((diff % 3600000) / 60000);
      setCountdown(days > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${hours}h ${mins}m` : `${mins} min`);
    }
    tick();
    intervalRef.current = setInterval(tick, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('wc26_token');
    if (!t) { router.push('/'); return; }
    fetch('/api/auth/me', { headers: { 'x-session-token': t } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.user.role !== 'participant') { router.push('/'); return; }
        setSession(data.user);
        fetchData();
      });
  }, [router, fetchData]);

  async function saveScore(matchId: number, h: number, a: number, w?: Side) {
    if (isClosed) return;
    setSaving(true);
    await fetch('/api/predictions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ matchId, home: h, away: a, winner: w }),
    });
    setPreds(prev => ({ ...prev, [String(matchId)]: { home: h, away: a, winner: w } }));
    setSaving(false);
  }

  async function saveGroupPos(g: string, first: string, second: string) {
    if (isClosed) return;
    setSaving(true);
    await fetch('/api/predictions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ type: 'group_position', group: g, first, second }),
    });
    setGPreds(prev => ({ ...prev, [g]: { first, second } }));
    setSaving(false);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-session-token': token() } });
    localStorage.removeItem('wc26_token'); localStorage.removeItem('wc26_user');
    router.push('/');
  }

  const { matchPts, posPts } = (() => {
    let mp = 0, cp = 0, pp = 0;
    for (const [mid, res] of Object.entries(results)) {
      if (!res.played) continue;
      const pred = preds[mid];
      if (!pred) continue;
      const match = ALL_MATCHES.find(m => String(m.id) === mid);
      if (!match) continue;
      mp += calcMatchPoints(pred, res, match.round);
      if (ROUND_RULES[match.round]?.classified !== undefined || match.round === 'final')
        cp += calcClassifiedPoints(pred, pred.winner ?? null, res, res.winner ?? null, match.round);
    }
    for (const g of GROUPS) {
      const actual = standings[g], predicted = gPreds[g];
      if (!actual || !predicted) continue;
      pp += calcGroupPositionPoints(predicted, actual);
    }
    return { matchPts: mp, posPts: pp };
  })();

  const totalPts    = matchPts + posPts;
  const playedCount = Object.values(results).filter(r => r.played).length;

  if (!session) return null;

  return (
    <main className="min-h-screen relative z-10">
      <div className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Participante</div>
            <div className="text-sm font-bold text-white">{session.displayName}</div>
          </div>
          <div className="glass rounded-xl px-3 py-1.5 text-center">
            <div className="text-xl font-black text-amber-400">{totalPts}</div>
            <div className="text-xs text-slate-500">puntos</div>
          </div>
          <div className="flex gap-2">
            <Link href="/leaderboard" className="btn-outline text-xs">🏅 Ranking</Link>
            <Link href="/change-password" className="btn-outline text-xs">🔑</Link>
            <button onClick={logout} className="btn-outline text-xs text-red-400">Salir</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        <DeadlineBanner closed={isClosed} countdown={countdown} />

        {!loading && (
          <div className="grid grid-cols-3 gap-2 mb-5 fade-in">
            <div className="glass rounded-xl p-3 text-center"><div className="text-base font-black text-white">{matchPts}</div><div className="text-xs text-slate-500">marcadores</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="text-base font-black text-white">{posPts}</div><div className="text-xs text-slate-500">posiciones</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="text-base font-black text-white">{playedCount}</div><div className="text-xs text-slate-500">jugados</div></div>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[{ key: 'grupos' as const, label: '⚽ Partidos de Grupos' }, { key: 'clasificados' as const, label: '📋 Clasificados por Grupo' }].map(tab => (
            <button key={tab.key} onClick={() => setPhase(tab.key)}
              className={`tab-btn ${phase === tab.key ? 'tab-active' : 'tab-inactive'}`}>{tab.label}</button>
          ))}
        </div>

        {phase === 'grupos' && (
          <div className="fade-in">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {GROUPS.map(g => (
                <button key={g} onClick={() => setGroup(g)}
                  className={`tab-btn text-sm w-10 ${group === g ? 'tab-active' : 'tab-inactive'}`}>{g}</button>
              ))}
            </div>
            {loading ? <div className="text-center py-16 text-slate-500">Cargando...</div> : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black"
                    style={{ background: 'linear-gradient(135deg,#e63946,#c1121f)' }}>{group}</div>
                  <div>
                    <h2 className="font-bold text-white">Grupo {group}</h2>
                    <p className="text-xs text-slate-500">{getGroupTeams(group).map(t => t.name).join('  ·  ')}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs text-amber-500 font-bold">4 exacto · 2 resultado</div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {getMatchesByGroup(group).map(match => (
                    <MatchCard key={match.id} match={match}
                      prediction={preds[String(match.id)]} result={results[String(match.id)]}
                      onSave={saveScore} saving={saving} isKnockout={false} closed={isClosed} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'clasificados' && (
          <div className="fade-in">
            <div className="glass rounded-xl p-4 mb-4 text-sm">
              <p className="text-slate-400">
                Pronostica <strong className="text-amber-400">1° y 2°</strong> de cada grupo.&nbsp;
                <span className="text-emerald-400 font-bold">10 pts</span> exacto ·&nbsp;
                <span className="text-blue-400 font-bold">5 pts</span> posición incorrecta
              </p>
            </div>
            {loading ? <div className="text-center py-16 text-slate-500">Cargando...</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GROUPS.map(g => (
                  <GroupPosCard key={g} group={g} teams={getGroupTeams(g)}
                    prediction={gPreds[g]} standing={standings[g]} onSave={saveGroupPos} closed={isClosed} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function PredictPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>}>
      <PredictContent />
    </Suspense>
  );
}
