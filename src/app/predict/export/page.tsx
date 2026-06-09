'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GROUPS, GROUP_MATCHES, getGroupTeams, type Team,
} from '@/lib/matchData';
import { calcMatchPoints, calcGroupPositionPoints } from '@/lib/scoring';

interface ScorePred    { home: number; away: number; }
interface ResultEntry  { home: number; away: number; played: boolean; locked: boolean; }
interface GroupPos     { first: string; second: string; third?: string; }
interface GroupStanding{ first: string; second: string; third?: string; thirdClassified?: boolean; }
interface SessionUser  { username: string; displayName: string; empresaName: string; }

function teamName(code: string, teams: Team[]): string {
  return teams.find(t => t.code === code)?.name ?? code;
}

function isoCode(code: string, teams: Team[]): string {
  return teams.find(t => t.code === code)?.isoCode ?? '';
}

function FlagImg({ iso, name }: { iso: string; name: string }) {
  if (!iso) return <span>—</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={name}
      style={{ width: 20, height: 'auto', display: 'inline', verticalAlign: 'middle', marginRight: 4 }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

const MONTH_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTH_ES[parseInt(m) - 1]}`;
}

// All group matches sorted chronologically
const SORTED_MATCHES = [...GROUP_MATCHES].sort((a, b) =>
  a.date.localeCompare(b.date) || a.id - b.id
);

// All teams from all groups
const ALL_GROUP_TEAMS: Record<string, Team[]> = {};
GROUPS.forEach(g => { ALL_GROUP_TEAMS[g] = getGroupTeams(g); });

export default function ExportPage() {
  const router = useRouter();
  const [session,   setSession]   = useState<SessionUser | null>(null);
  const [preds,     setPreds]     = useState<Record<string, ScorePred>>({});
  const [gPreds,    setGPreds]    = useState<Record<string, GroupPos>>({});
  const [results,   setResults]   = useState<Record<string, ResultEntry>>({});
  const [standings, setStandings] = useState<Record<string, GroupStanding>>({});
  const [loading,   setLoading]   = useState(true);
  const [genDate,   setGenDate]   = useState('');

  function token() { return localStorage.getItem('wc26_token') || ''; }

  useEffect(() => {
    const t = localStorage.getItem('wc26_token');
    if (!t) { router.push('/'); return; }
    fetch('/api/auth/me', { headers: { 'x-session-token': t } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.user.role !== 'participant') { router.push('/'); return; }
        setSession(data.user);
        setGenDate(new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }));
      });
  }, [router]);

  useEffect(() => {
    if (!session) return;
    const t = token();
    Promise.all([
      fetch('/api/predictions', { headers: { 'x-session-token': t } }).then(r => r.json()),
      fetch('/api/results').then(r => r.json()),
    ]).then(([p, r]) => {
      setPreds(p.predictions || {});
      setGPreds(p.groupPredictions || {});
      setResults(r.results || {});
      setStandings(r.standings || {});
      setLoading(false);
    });
  }, [session]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  let totalMatchPts = 0, totalPosPts = 0;
  if (!loading) {
    for (const m of GROUP_MATCHES) {
      const res = results[String(m.id)];
      const pred = preds[String(m.id)];
      if (res?.played && pred) totalMatchPts += calcMatchPoints(pred, res, 'group');
    }
    for (const g of GROUPS) {
      const s = standings[g], p = gPreds[g];
      if (s && p) totalPosPts += calcGroupPositionPoints(p, s);
    }
  }
  const totalPts = totalMatchPts + totalPosPts;
  const playedCount = Object.values(results).filter(r => r.played).length;

  if (loading || !session) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>Generando PDF…</div>;
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          @page { margin: 1.5cm; size: A4; }
        }
        body { background: white; color: #111; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        th { background: #f0f0f0; font-weight: 700; }
        .pts-exact  { color: #059669; font-weight: 700; }
        .pts-result { color: #2563eb; font-weight: 700; }
        .pts-miss   { color: #9ca3af; }
        .section-title { font-size: 13px; font-weight: 700; margin: 16px 0 8px; border-bottom: 2px solid #111; padding-bottom: 4px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
        .summary-box { display: flex; gap: 24px; margin-bottom: 16px; }
        .summary-item { text-align: center; }
        .summary-num  { font-size: 22px; font-weight: 900; color: #111; }
        .summary-lbl  { font-size: 10px; color: #666; }
        .tag-third    { background: #d1fae5; color: #065f46; border-radius: 3px; padding: 1px 5px; font-size: 10px; font-weight: 700; }
      `}</style>

      {/* ── Botones (ocultos al imprimir) ── */}
      <div className="no-print" style={{ position: 'sticky', top: 0, background: '#1e293b', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', zIndex: 100 }}>
        <button onClick={() => window.print()}
          style={{ background: '#f59e0b', color: '#111', fontWeight: 700, border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>
          🖨️ Guardar como PDF
        </button>
        <button onClick={() => router.push('/predict')}
          style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
          ← Volver
        </button>
        <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>
          Usa <strong style={{ color: '#f8fafc' }}>Ctrl+P</strong> → "Guardar como PDF" en el diálogo de impresión
        </span>
      </div>

      {/* ── Documento ── */}
      <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>

        {/* Encabezado */}
        <div className="header">
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>🏆 POLLA MUNDIAL 2026</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{session.displayName}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{session.empresaName} · Generado el {genDate}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#555' }}>USA · Canadá · México</div>
            <div style={{ fontSize: 11, color: '#555' }}>11 Jun – 19 Jul 2026</div>
          </div>
        </div>

        {/* Resumen de puntos */}
        <div className="summary-box">
          <div className="summary-item">
            <div className="summary-num">{totalPts}</div>
            <div className="summary-lbl">Total puntos</div>
          </div>
          <div className="summary-item">
            <div className="summary-num">{totalMatchPts}</div>
            <div className="summary-lbl">Marcadores</div>
          </div>
          <div className="summary-item">
            <div className="summary-num">{totalPosPts}</div>
            <div className="summary-lbl">Posiciones</div>
          </div>
          <div className="summary-item">
            <div className="summary-num">{playedCount}</div>
            <div className="summary-lbl">Partidos jugados</div>
          </div>
        </div>

        {/* ── Clasificados por Grupo ── */}
        <div className="section-title">Clasificados por Grupo</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>Grupo</th>
              <th>🥇 1° (pred)</th>
              <th>🥈 2° (pred)</th>
              <th>🥉 Mejor 3° (pred)</th>
              <th>Real 1°</th>
              <th>Real 2°</th>
              <th>Real 3°</th>
              <th style={{ width: 40, textAlign: 'center' }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map(g => {
              const teams = ALL_GROUP_TEAMS[g];
              const p = gPreds[g];
              const s = standings[g];
              const pts = p && s ? calcGroupPositionPoints(p, s) : null;
              return (
                <tr key={g}>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>{g}</td>
                  <td>
                    {p?.first
                      ? <><FlagImg iso={isoCode(p.first, teams)} name={teamName(p.first, teams)} />{teamName(p.first, teams)}</>
                      : <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td>
                    {p?.second
                      ? <><FlagImg iso={isoCode(p.second, teams)} name={teamName(p.second, teams)} />{teamName(p.second, teams)}</>
                      : <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td>
                    {p?.third
                      ? <><FlagImg iso={isoCode(p.third, teams)} name={teamName(p.third, teams)} />{teamName(p.third, teams)}{' '}
                          {s?.thirdClassified && s.third === p.third && <span className="tag-third">clasifica ✓</span>}
                        </>
                      : <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td style={{ color: s?.first ? '#111' : '#aaa' }}>
                    {s?.first ? <><FlagImg iso={isoCode(s.first, teams)} name={teamName(s.first, teams)} />{teamName(s.first, teams)}</> : '—'}
                  </td>
                  <td style={{ color: s?.second ? '#111' : '#aaa' }}>
                    {s?.second ? <><FlagImg iso={isoCode(s.second, teams)} name={teamName(s.second, teams)} />{teamName(s.second, teams)}</> : '—'}
                  </td>
                  <td style={{ color: s?.third ? '#111' : '#aaa' }}>
                    {s?.third
                      ? <><FlagImg iso={isoCode(s.third, teams)} name={teamName(s.third, teams)} />{teamName(s.third, teams)}
                          {s.thirdClassified && <span className="tag-third" style={{ marginLeft: 4 }}>✓</span>}
                        </>
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {pts !== null
                      ? <span className={pts > 0 ? 'pts-exact' : 'pts-miss'}>{pts > 0 ? `+${pts}` : '0'}</span>
                      : <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Partidos de Grupos (cronológico) ── */}
        <div className="section-title" style={{ marginTop: 24 }}>Partidos de Grupos — Orden Cronológico</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>Fecha</th>
              <th style={{ width: 24 }}>#</th>
              <th style={{ width: 30, textAlign: 'center' }}>G</th>
              <th>Local</th>
              <th style={{ width: 60, textAlign: 'center' }}>Pronóstico</th>
              <th style={{ width: 50, textAlign: 'center' }}>Real</th>
              <th>Visitante</th>
              <th style={{ width: 50, textAlign: 'center' }}>Pts</th>
              <th style={{ width: 80 }}>Sede</th>
            </tr>
          </thead>
          <tbody>
            {SORTED_MATCHES.map(match => {
              const pred   = preds[String(match.id)];
              const result = results[String(match.id)];
              const pts    = result?.played && pred ? calcMatchPoints(pred, result, 'group') : null;
              const homeTeams = ALL_GROUP_TEAMS[match.group!];
              const homeIso   = match.homeTeam.isoCode;
              const awayIso   = match.awayTeam.isoCode;
              return (
                <tr key={match.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(match.date)}</td>
                  <td style={{ color: '#888', fontSize: 10 }}>{match.id}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{match.group}</td>
                  <td>
                    <FlagImg iso={homeIso} name={match.homeTeam.name} />
                    {match.homeTeam.name}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {pred ? `${pred.home} – ${pred.away}` : <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: result?.played ? '#111' : '#aaa' }}>
                    {result?.played ? `${result.home} – ${result.away}` : '—'}
                  </td>
                  <td>
                    <FlagImg iso={awayIso} name={match.awayTeam.name} />
                    {match.awayTeam.name}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {pts !== null
                      ? <span className={pts === 4 ? 'pts-exact' : pts === 2 ? 'pts-result' : 'pts-miss'}>
                          {pts > 0 ? `+${pts}` : '0'}
                        </span>
                      : <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 10, color: '#555' }}>{match.venue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 24, textAlign: 'center', color: '#888', fontSize: 10 }}>
          Polla Mundial 2026 · {session.displayName} · {session.empresaName}
        </div>
      </div>
    </>
  );
}
