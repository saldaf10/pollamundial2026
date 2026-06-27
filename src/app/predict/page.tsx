'use client';
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GROUPS, ALL_MATCHES, KNOCKOUT_MATCH_IDS, getMatchesByGroup, getGroupTeams,
  getTeamByCode, getMatchById, type Match, type Team,
} from '@/lib/matchData';
import { calcMatchPoints, calcGroupPositionPoints, computeKnockoutPoints, resolveBracket,
  ROUND_RULES, derivedWinner, type Side } from '@/lib/scoring';
import { PREDICTIONS_DEADLINE_ISO, GROUP_POS_DEADLINE_ISO, KNOCKOUT_DEADLINE_ISO } from '@/lib/config';
import { Flag } from '@/components/Flag';
import { BracketLayout, BRACKET } from '@/components/Bracket';

interface ResultEntry { home: number; away: number; played: boolean; locked: boolean; winner?: Side; }
interface ScorePred   { home: number; away: number; winner?: Side; }
interface GroupPos    { first: string; second: string; third?: string; }
interface GroupStanding { first: string; second: string; third?: string; thirdClassified?: boolean; }
interface SessionUser { username: string; displayName: string; role: string; empresaSlug: string; empresaName: string; }

function PtsBadge({ pts, max }: { pts: number; max: number }) {
  if (pts === max) return <span className="badge-exact text-xs font-bold px-2 py-0.5 rounded-full">+{pts} exacto</span>;
  if (pts > 0)    return <span className="badge-result text-xs font-bold px-2 py-0.5 rounded-full">+{pts} pts</span>;
  return <span className="badge-miss text-xs font-bold px-2 py-0.5 rounded-full">0 pts</span>;
}

function MatchCard({ match, prediction, result, onSave, saving, isKnockout, closed, onValueChange }: {
  match: Match; prediction?: ScorePred; result?: ResultEntry;
  onSave: (id: number, h: number, a: number, w?: Side) => void;
  saving: boolean; isKnockout: boolean; closed: boolean;
  onValueChange?: (id: number, h: string, a: string, w?: Side) => void;
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

  function handleH(val: string) { setH(val); onValueChange?.(match.id, val, a, w); }
  function handleA(val: string) { setA(val); onValueChange?.(match.id, h, val, w); }

  const isLocked = closed || result?.locked;
  const isPlayed = result?.played;
  const rules    = ROUND_RULES[match.round];
  const maxPts   = rules?.exact ?? 4;
  const matchPts = isPlayed && prediction && result ? calcMatchPoints(prediction, result, match.round) : null;

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
          <input type="number" min={0} max={20} value={h} onChange={e => handleH(e.target.value)}
            disabled={!!isLocked || saving} className="score-input" />
          <span className="text-slate-500 font-bold">–</span>
          <input type="number" min={0} max={20} value={a} onChange={e => handleA(e.target.value)}
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

function GroupPosCard({ group, teams, prediction, standing, onSave, closed, thirdsCount }: {
  group: string; teams: Team[]; prediction?: GroupPos; standing?: GroupStanding;
  onSave: (g: string, first: string, second: string, third?: string) => void;
  closed: boolean; thirdsCount: number;
}) {
  const [first,  setFirst]  = useState(prediction?.first  || '');
  const [second, setSecond] = useState(prediction?.second || '');
  const [third,  setThird]  = useState(prediction?.third  || '');
  const [saved,  setSaved]  = useState(false);
  useEffect(() => {
    setFirst(prediction?.first || ''); setSecond(prediction?.second || ''); setThird(prediction?.third || '');
  }, [prediction]);

  const pts = standing && prediction ? calcGroupPositionPoints(prediction, standing) : null;
  const maxPts = 20 + (standing?.third ? 10 : 0);
  const thirdLocked = closed || (!third && thirdsCount >= 8);

  function save() {
    if (!first || !second || first === second || closed) return;
    onSave(group, first, second, third || undefined);
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className={`match-card p-4 ${closed ? 'locked' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded flex items-center justify-center font-black text-xs"
          style={{ background: 'linear-gradient(135deg,#e63946,#c1121f)' }}>{group}</div>
        <span className="text-sm font-bold text-white">Grupo {group}</span>
        <div className="ml-auto flex items-center gap-2">
          {pts !== null && <PtsBadge pts={pts} max={maxPts} />}
          {standing && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            Real:&nbsp;
            <Flag isoCode={teams.find(t => t.code === standing.first)?.isoCode  ?? ''} name="" size={16} />
            <Flag isoCode={teams.find(t => t.code === standing.second)?.isoCode ?? ''} name="" size={16} />
            {standing.third && (
              <>
                <span className="text-slate-600">·</span>
                <Flag isoCode={teams.find(t => t.code === standing.third)?.isoCode ?? ''} name="" size={16} />
                {standing.thirdClassified && <span className="text-emerald-400 text-xs">✓</span>}
              </>
            )}
          </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-amber-400 font-bold block mb-1">🥇 1° Clasificado</label>
            <select value={first} onChange={e => setFirst(e.target.value)} disabled={closed}
              className="w-full border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 disabled:opacity-50"
              style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
              <option value="">— Elegir —</option>
              {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === second || t.code === third}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 font-bold block mb-1">🥈 2° Clasificado</label>
            <select value={second} onChange={e => setSecond(e.target.value)} disabled={closed}
              className="w-full border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400 disabled:opacity-50"
              style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
              <option value="">— Elegir —</option>
              {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === first || t.code === third}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className={`text-xs font-bold block mb-1 ${thirdLocked && !third ? 'text-slate-600' : 'text-slate-300'}`}>
              🥉 3° Mejor Tercero
              {thirdLocked && !third && <span className="ml-1 text-slate-600 font-normal">(8/8 llenos)</span>}
            </label>
            <select value={third} onChange={e => setThird(e.target.value)} disabled={thirdLocked}
              className="w-full border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400 disabled:opacity-40"
              style={{ backgroundColor: '#0d1b35', colorScheme: 'dark' }}>
              <option value="">— No seleccionar —</option>
              {teams.map(t => <option key={t.code} value={t.code} disabled={t.code === first || t.code === second}>{t.name}</option>)}
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
    </div>
  );
}

function KnockoutCard({ match, homeCode, awayCode, realAdvCode, pending, result, onChange, onSave, closed, saving }: {
  match: Match; homeCode?: string; awayCode?: string; realAdvCode?: string;
  pending?: { h: string; a: string; w?: Side }; result?: ResultEntry;
  onChange: (id: number, h: string, a: string, w?: Side) => void;
  onSave: (id: number) => void; closed: boolean; saving: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const home = homeCode ? getTeamByCode(homeCode) : undefined;
  const away = awayCode ? getTeamByCode(awayCode) : undefined;
  const ready = !!home && !!away;
  const h = pending?.h ?? '';
  const a = pending?.a ?? '';
  const w = pending?.w;
  const isLocked = closed || result?.locked;
  const isPlayed = result?.played;
  const isDraw = h !== '' && a !== '' && parseInt(h) === parseInt(a);
  const incomplete = h === '' || a === '' || (isDraw && !w);
  const rules = ROUND_RULES[match.round];

  // Equipo que el participante hace avanzar
  const myAdv = !ready || incomplete ? undefined
    : isDraw ? (w === 'home' ? homeCode : awayCode)
    : (parseInt(h) > parseInt(a) ? homeCode : awayCode);
  const advRight = isPlayed && realAdvCode ? myAdv === realAdvCode : null;

  function handleSave() {
    if (!ready || incomplete) return;
    onSave(match.id);
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const TeamRow = ({ team, side }: { team?: Team; side: Side }) => (
    <div className="flex items-center gap-2 min-w-0">
      <Flag isoCode={team?.isoCode ?? ''} name={team?.name ?? ''} size={20} />
      <span className={`text-xs font-semibold truncate ${team ? 'text-white' : 'text-slate-600 italic'}`}>
        {team?.name ?? 'Por definir'}
      </span>
      {myAdv && ((side === 'home' && myAdv === homeCode) || (side === 'away' && myAdv === awayCode)) && (
        <span className="ml-auto text-emerald-400 text-xs shrink-0" title="Avanza">▲</span>
      )}
    </div>
  );

  return (
    <div className={`match-card p-3 ${isLocked ? 'locked' : ''} ${!ready ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs text-slate-600 font-mono">#{match.id}</span>
        {result?.locked && !closed && <span className="text-xs text-amber-500">🔒</span>}
        {advRight !== null && (
          <span className={`ml-auto text-xs font-bold ${advRight ? 'text-emerald-400' : 'text-red-400'}`}>
            {advRight ? '✓ acertó' : '✗ falló'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0"><TeamRow team={home} side="home" /></div>
          <input type="number" min={0} max={20} value={h} disabled={!ready || !!isLocked || saving}
            onChange={e => onChange(match.id, e.target.value, a, w)}
            className="score-input w-9 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0"><TeamRow team={away} side="away" /></div>
          <input type="number" min={0} max={20} value={a} disabled={!ready || !!isLocked || saving}
            onChange={e => onChange(match.id, h, e.target.value, w)}
            className="score-input w-9 h-8 text-sm" />
        </div>
      </div>
      {isDraw && ready && !isLocked && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-amber-400">Penales:</span>
          {(['home', 'away'] as Side[]).map(side => (
            <button key={side} onClick={() => onChange(match.id, h, a, side)}
              className={`px-2 py-0.5 rounded text-xs font-bold border transition-all ${
                w === side ? 'bg-amber-500/20 border-amber-400/60 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
              {(side === 'home' ? home : away)?.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {isPlayed && result && (
          <span className="text-xs text-slate-500">Real: <strong className="text-white">{result.home}–{result.away}</strong></span>
        )}
        {!isLocked && (
          <button onClick={handleSave} disabled={saving || !ready || incomplete}
            className={`ml-auto px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              saved ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40'}`}>
            {saved ? '✓' : 'OK'}
          </button>
        )}
      </div>
      <div className="mt-1 text-center text-[10px] text-slate-600">
        {rules?.exact} exacto · {rules?.result} result · {match.round === 'final' ? `${rules?.champion} campeón` : `${rules?.classified} clasif.`}
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
        <div className="text-xs text-slate-400">Cierre: <strong className="text-white">11 de junio 2026 · 2:00 p.m. (hora Colombia)</strong>{countdown ? ` · Faltan ${countdown}` : ''}</div>
      </div>
    </div>
  );
}

function PredictContent() {
  const router = useRouter();
  const [session,      setSession]      = useState<SessionUser | null>(null);
  const [phase,        setPhase]        = useState<'grupos' | 'clasificados' | 'eliminatorias'>('grupos');
  const [group,        setGroup]        = useState('A');
  const [preds,        setPreds]        = useState<Record<string, ScorePred>>({});
  const [gPreds,       setGPreds]       = useState<Record<string, GroupPos>>({});
  const [results,      setResults]      = useState<Record<string, ResultEntry>>({});
  const [standings,    setStandings]    = useState<Record<string, GroupStanding>>({});
  const [r32Teams,     setR32Teams]     = useState<Record<string, { home: string; away: string }>>({});
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [countdown,         setCountdown]         = useState('');
  const [isClosed,          setIsClosed]          = useState(false);
  const [isGroupPosClosed,  setIsGroupPosClosed]  = useState(false);
  const [groupPosCountdown, setGroupPosCountdown] = useState('');
  const [isKoClosed,        setIsKoClosed]        = useState(false);
  const [koCountdown,       setKoCountdown]       = useState('');
  const [groupPending, setGroupPending] = useState<Record<number, { h: string; a: string; w?: Side }>>({});
  const [koPending,    setKoPending]    = useState<Record<number, { h: string; a: string; w?: Side }>>({});
  const [batchSaved,   setBatchSaved]   = useState(false);
  const [koBatchSaved, setKoBatchSaved] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function token() { return localStorage.getItem('wc26_token') || ''; }

  const fetchData = useCallback(async () => {
    const [p, r] = await Promise.all([
      fetch('/api/predictions', { headers: { 'x-session-token': token() } }),
      fetch('/api/results'),
    ]);
    if (p.ok) { const d = await p.json(); setPreds(d.predictions || {}); setGPreds(d.groupPredictions || {}); }
    if (r.ok) { const d = await r.json(); setResults(d.results || {}); setStandings(d.standings || {}); setR32Teams(d.r32Teams || {}); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const scoreDeadline  = new Date(PREDICTIONS_DEADLINE_ISO);
    const groupDeadline  = new Date(GROUP_POS_DEADLINE_ISO);
    const koDeadline     = new Date(KNOCKOUT_DEADLINE_ISO);
    function fmt(diff: number) {
      const days  = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins  = Math.floor((diff % 3600000) / 60000);
      return days > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    }
    function tick() {
      const now = new Date();
      const scoreDiff = scoreDeadline.getTime() - now.getTime();
      const groupDiff = groupDeadline.getTime() - now.getTime();
      const koDiff    = koDeadline.getTime() - now.getTime();
      setIsClosed(scoreDiff <= 0);
      setCountdown(scoreDiff > 0 ? fmt(scoreDiff) : '');
      setIsGroupPosClosed(groupDiff <= 0);
      setGroupPosCountdown(groupDiff > 0 ? fmt(groupDiff) : '');
      setIsKoClosed(koDiff <= 0);
      setKoCountdown(koDiff > 0 ? fmt(koDiff) : '');
      if (scoreDiff <= 0 && groupDiff <= 0 && koDiff <= 0 && intervalRef.current) clearInterval(intervalRef.current);
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

  useEffect(() => {
    if (loading) return;
    const init: Record<number, { h: string; a: string; w?: Side }> = {};
    for (const m of getMatchesByGroup(group)) {
      const p = preds[String(m.id)];
      init[m.id] = { h: p ? String(p.home) : '', a: p ? String(p.away) : '', w: p?.winner };
    }
    setGroupPending(init);
    setBatchSaved(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, loading]);

  // Inicializa el bracket de mata-mata desde las predicciones guardadas (una vez al cargar).
  useEffect(() => {
    if (loading) return;
    const init: Record<number, { h: string; a: string; w?: Side }> = {};
    for (const id of KNOCKOUT_MATCH_IDS) {
      const p = preds[String(id)];
      if (p) init[id] = { h: String(p.home), a: String(p.away), w: p.winner };
    }
    setKoPending(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Bracket resuelto en vivo desde lo que el participante va llenando.
  const koSlots = useMemo(() => {
    const scoreMap: Record<string, { home: number; away: number; winner?: Side }> = {};
    for (const id of KNOCKOUT_MATCH_IDS) {
      const v = koPending[id];
      if (!v) continue;
      const hn = parseInt(v.h), an = parseInt(v.a);
      if (isNaN(hn) || isNaN(an)) continue;
      scoreMap[String(id)] = { home: hn, away: an, ...(v.w ? { winner: v.w } : {}) };
    }
    return resolveBracket(r32Teams, scoreMap);
  }, [koPending, r32Teams]);

  // Bracket real (para mostrar aciertos por llave).
  const koRealSlots = useMemo(() => {
    const scoreMap: Record<string, { home: number; away: number; winner?: Side }> = {};
    for (const [id, res] of Object.entries(results)) {
      if (!res.played) continue;
      scoreMap[id] = { home: res.home, away: res.away, ...(res.winner ? { winner: res.winner } : {}) };
    }
    return resolveBracket(r32Teams, scoreMap);
  }, [results, r32Teams]);

  const r32Ready = Object.keys(r32Teams).length > 0;

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

  async function saveGroupAll() {
    if (isClosed) return;
    const matches = getMatchesByGroup(group).filter(m => {
      const v = groupPending[m.id];
      return v && v.h !== '' && v.a !== '' && !isNaN(parseInt(v.h)) && !isNaN(parseInt(v.a));
    });
    if (matches.length === 0) return;
    setSaving(true);
    await Promise.all(matches.map(m => {
      const v = groupPending[m.id];
      return fetch('/api/predictions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
        body: JSON.stringify({ matchId: m.id, home: parseInt(v.h), away: parseInt(v.a) }),
      });
    }));
    setPreds(prev => {
      const updated = { ...prev };
      matches.forEach(m => {
        const v = groupPending[m.id];
        updated[String(m.id)] = { home: parseInt(v.h), away: parseInt(v.a), winner: v.w };
      });
      return updated;
    });
    setSaving(false);
    setBatchSaved(true);
    setTimeout(() => setBatchSaved(false), 2000);
  }

  async function saveGroupPos(g: string, first: string, second: string, third?: string) {
    if (isGroupPosClosed) return;
    setSaving(true);
    await fetch('/api/predictions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ type: 'group_position', group: g, first, second, third: third || null }),
    });
    setGPreds(prev => ({ ...prev, [g]: { first, second, third } }));
    setSaving(false);
  }

  function onKoChange(id: number, h: string, a: string, w?: Side) {
    setKoPending(prev => ({ ...prev, [id]: { h, a, w } }));
  }

  function koBody(id: number): { matchId: number; home: number; away: number; winner?: Side } | null {
    const v = koPending[id];
    if (!v) return null;
    const hn = parseInt(v.h), an = parseInt(v.a);
    if (isNaN(hn) || isNaN(an)) return null;
    const tie = hn === an;
    const winner: Side | undefined = tie ? v.w : (hn > an ? 'home' : 'away');
    if (tie && !winner) return null; // empate sin definir penales
    return { matchId: id, home: hn, away: an, winner };
  }

  async function saveKoMatch(id: number) {
    if (isKoClosed) return;
    const body = koBody(id);
    if (!body) return;
    setSaving(true);
    await fetch('/api/predictions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify(body),
    });
    setPreds(prev => ({ ...prev, [String(id)]: { home: body.home, away: body.away, winner: body.winner } }));
    setSaving(false);
  }

  async function saveKoAll() {
    if (isKoClosed) return;
    const bodies = KNOCKOUT_MATCH_IDS
      .filter(id => koSlots[id]?.home && koSlots[id]?.away)
      .map(id => koBody(id))
      .filter((b): b is NonNullable<ReturnType<typeof koBody>> => b !== null);
    if (bodies.length === 0) return;
    setSaving(true);
    await Promise.all(bodies.map(b => fetch('/api/predictions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify(b),
    })));
    setPreds(prev => {
      const updated = { ...prev };
      bodies.forEach(b => { updated[String(b.matchId)] = { home: b.home, away: b.away, winner: b.winner }; });
      return updated;
    });
    setSaving(false);
    setKoBatchSaved(true);
    setTimeout(() => setKoBatchSaved(false), 2000);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-session-token': token() } });
    localStorage.removeItem('wc26_token'); localStorage.removeItem('wc26_user');
    router.push('/');
  }

  const thirdsCount = GROUPS.filter(g => !!gPreds[g]?.third).length;

  const { matchPts, posPts, koPts } = (() => {
    let mp = 0, pp = 0;
    for (const [mid, res] of Object.entries(results)) {
      if (!res.played) continue;
      const pred = preds[mid];
      if (!pred) continue;
      const match = ALL_MATCHES.find(m => String(m.id) === mid);
      if (!match || match.round !== 'group') continue;
      mp += calcMatchPoints(pred, res, match.round);
    }
    for (const g of GROUPS) {
      const actual = standings[g], predicted = gPreds[g];
      if (!actual || !predicted) continue;
      pp += calcGroupPositionPoints(predicted, actual);
    }
    const ko = computeKnockoutPoints(r32Teams, results, preds);
    return { matchPts: mp, posPts: pp, koPts: ko.total };
  })();

  const totalPts    = matchPts + posPts + koPts;
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
            <Link href="/predict/export" className="btn-outline text-xs">📄 PDF</Link>
            <Link href="/change-password" className="btn-outline text-xs">🔑</Link>
            <button onClick={logout} className="btn-outline text-xs text-red-400">Salir</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        <DeadlineBanner closed={isClosed} countdown={countdown} />

        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 fade-in">
            <div className="glass rounded-xl p-3 text-center"><div className="text-base font-black text-white">{matchPts}</div><div className="text-xs text-slate-500">marcadores</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="text-base font-black text-white">{posPts}</div><div className="text-xs text-slate-500">posiciones</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="text-base font-black text-white">{koPts}</div><div className="text-xs text-slate-500">mata-mata</div></div>
            <div className="glass rounded-xl p-3 text-center"><div className="text-base font-black text-white">{playedCount}</div><div className="text-xs text-slate-500">jugados</div></div>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[{ key: 'grupos' as const, label: '⚽ Partidos de Grupos' }, { key: 'clasificados' as const, label: '📋 Clasificados por Grupo' }, { key: 'eliminatorias' as const, label: '🗝️ Eliminatorias' }].map(tab => (
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
                  <div className="ml-auto flex items-center gap-2">
                    <div className="text-xs text-amber-500 font-bold">4 exacto · 2 resultado</div>
                    {!isClosed && (
                      <button onClick={saveGroupAll} disabled={saving}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${
                          batchSaved
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-white/5 border-white/15 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400'}`}>
                        {batchSaved ? '✓ Guardados' : 'Guardar todos'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {getMatchesByGroup(group).map(match => (
                    <MatchCard key={match.id} match={match}
                      prediction={preds[String(match.id)]} result={results[String(match.id)]}
                      onSave={saveScore} saving={saving} isKnockout={false} closed={isClosed}
                      onValueChange={(id, h, a, w) => setGroupPending(prev => ({ ...prev, [id]: { h, a, w } }))} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'clasificados' && (
          <div className="fade-in">
            {/* Group pos deadline banner */}
            {isGroupPosClosed ? (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="text-xl">🔒</span>
                <div>
                  <div className="font-bold text-red-400">Clasificados cerrados</div>
                  <div className="text-xs text-slate-400">El primer partido comenzó el 11 de junio a las 2:00 p.m. Colombia.</div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm"
                style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="text-xl">⏳</span>
                <div>
                  <div className="font-bold text-emerald-400">Clasificados abiertos</div>
                  <div className="text-xs text-slate-400">
                    Cierre: <strong className="text-white">11 de junio 2026 · 2:00 p.m. (hora Colombia)</strong>
                    {groupPosCountdown ? ` · Faltan ${groupPosCountdown}` : ''}
                  </div>
                </div>
              </div>
            )}
            <div className="glass rounded-xl p-4 mb-4 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                <p className="text-slate-400">
                  Pronostica <strong className="text-amber-400">1° y 2°</strong> de cada grupo.&nbsp;
                  <span className="text-emerald-400 font-bold">10 pts</span> exacto ·&nbsp;
                  <span className="text-blue-400 font-bold">5 pts</span> posición incorrecta
                </p>
                <p className="text-slate-400">
                  <strong className="text-slate-300">🥉 3° Mejor Tercero</strong>: elige hasta{' '}
                  <strong className="text-emerald-400">8 grupos</strong> cuyos terceros clasifiquen.&nbsp;
                  <span className="text-emerald-400 font-bold">10 pts</span> si clasifica · <span className="text-slate-500">0 pts</span> si no clasifica
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${i < thirdsCount ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-400">{thirdsCount}/8 mejores terceros seleccionados</span>
              </div>
            </div>
            {loading ? <div className="text-center py-16 text-slate-500">Cargando...</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GROUPS.map(g => (
                  <GroupPosCard key={g} group={g} teams={getGroupTeams(g)}
                    prediction={gPreds[g]} standing={standings[g]}
                    onSave={saveGroupPos} closed={isGroupPosClosed} thirdsCount={thirdsCount} />
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'eliminatorias' && (
          <div className="fade-in">
            {isKoClosed ? (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="text-xl">🔒</span>
                <div>
                  <div className="font-bold text-red-400">Mata-mata cerrado</div>
                  <div className="text-xs text-slate-400">Los pronósticos de eliminatorias ya no se pueden modificar.</div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <span className="text-xl">⏳</span>
                <div>
                  <div className="font-bold text-amber-400">Eliminatorias abiertas</div>
                  <div className="text-xs text-slate-400">
                    Pon el marcador de cada llave; el sistema calcula quién avanza. En empate, elige quién pasa por penales.
                    {koCountdown ? ` · Cierra en ${koCountdown}` : ''}
                  </div>
                </div>
              </div>
            )}

            {loading ? <div className="text-center py-16 text-slate-500">Cargando...</div>
              : !r32Ready ? (
                <div className="glass rounded-2xl p-8 text-center text-slate-400">
                  <div className="text-3xl mb-2">🗝️</div>
                  <p className="font-bold text-white mb-1">El bracket aún no está disponible</p>
                  <p className="text-xs text-slate-500">El organizador todavía no ha definido los equipos de 16avos. Vuelve cuando termine la fase de grupos.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <p className="text-xs text-slate-500">Desliza horizontalmente para ver todas las rondas →</p>
                    {!isKoClosed && (
                      <button onClick={saveKoAll} disabled={saving}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${
                          koBatchSaved
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-white/5 border-white/15 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400'}`}>
                        {koBatchSaved ? '✓ Guardado' : 'Guardar bracket'}
                      </button>
                    )}
                  </div>
                  <BracketLayout nodeWidth={172}
                    renderNode={id => {
                      const m = getMatchById(id)!;
                      const slot = koSlots[id] || {};
                      return <KnockoutCard match={m} homeCode={slot.home} awayCode={slot.away}
                        realAdvCode={koRealSlots[id]?.adv} pending={koPending[id]} result={results[String(id)]}
                        onChange={onKoChange} onSave={saveKoMatch} closed={isKoClosed} saving={saving} />;
                    }}
                    thirdNode={(() => {
                      const m = getMatchById(BRACKET.third)!;
                      const slot = koSlots[BRACKET.third] || {};
                      return <KnockoutCard match={m} homeCode={slot.home} awayCode={slot.away}
                        realAdvCode={koRealSlots[BRACKET.third]?.adv} pending={koPending[BRACKET.third]} result={results[String(BRACKET.third)]}
                        onChange={onKoChange} onSave={saveKoMatch} closed={isKoClosed} saving={saving} />;
                    })()}
                  />
                </>
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
