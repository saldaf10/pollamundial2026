'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RankEntry { username: string; name: string; total: number; matchPts: number; classPts: number; posPts: number; }
const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const router = useRouter();
  const [ranking,   setRanking]   = useState<RankEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [role,      setRole]      = useState('');
  const [empresaName, setEmpresaName] = useState('');

  function token() { return localStorage.getItem('wc26_token') || ''; }

  function backLink() {
    if (role === 'superadmin') return '/superadmin';
    if (role === 'admin')      return '/admin';
    return '/predict';
  }

  function load() {
    setLoading(true);
    fetch('/api/leaderboard', { headers: { 'x-session-token': token() } })
      .then(r => r.ok ? r.json() : { ranking: [] })
      .then(d => { setRanking(d.ranking || []); setLoading(false); });
  }

  useEffect(() => {
    const t = localStorage.getItem('wc26_token');
    if (!t) { router.push('/'); return; }
    fetch('/api/auth/me', { headers: { 'x-session-token': t } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push('/'); return; }
        setRole(data.user.role);
        setEmpresaName(data.user.empresaName || '');
        load();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen relative z-10">
      <div className="glass border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={backLink()} className="text-amber-400 font-black text-lg">← WC26</Link>
          <div className="text-center">
            <div className="text-xl font-black text-white">Rankings</div>
            {empresaName && <div className="text-xs text-amber-400">{empresaName}</div>}
          </div>
          <button onClick={load} className="btn-outline text-xs">Actualizar</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8 fade-in">
          <div className="text-6xl mb-3">🏆</div>
          <h2 className="text-3xl font-black gradient-text">TABLA DE POSICIONES</h2>
          <p className="text-slate-500 text-sm mt-2">Mundial 2026 · {empresaName}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">Cargando...</div>
        ) : ranking.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center fade-in">
            <div className="text-4xl mb-4">⚽</div>
            <p className="text-slate-400">Aún no hay pronósticos registrados.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 fade-in">
            {ranking.length >= 3 && (
              <div className="flex gap-3 mb-4">
                {[1, 0, 2].map(idx => {
                  const entry = ranking[idx];
                  if (!entry) return null;
                  const isFirst = idx === 0;
                  return (
                    <div key={entry.username} className={`flex-1 glass rounded-2xl p-4 text-center border ${
                      isFirst ? 'border-amber-400/40 bg-amber-400/5' : idx === 1 ? 'border-slate-400/20' : 'border-amber-700/20'}`}>
                      <div className="text-3xl mb-1">{MEDALS[idx]}</div>
                      <div className={`font-black ${isFirst ? 'text-3xl text-amber-400' : 'text-2xl text-white'}`}>{entry.total}</div>
                      <div className="text-xs text-slate-400 mb-1">puntos</div>
                      <div className="font-bold text-sm text-white truncate">{entry.name}</div>
                      <div className="text-xs text-slate-600 mt-1">{entry.matchPts} marc. · {entry.classPts} clasif. · {entry.posPts} pos.</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 px-4 text-left text-xs text-slate-500 uppercase w-10">#</th>
                    <th className="py-3 px-4 text-left text-xs text-slate-500 uppercase">Participante</th>
                    <th className="py-3 px-4 text-right text-xs text-slate-500 uppercase">Pts</th>
                    <th className="py-3 px-4 text-right text-xs text-slate-500 uppercase hidden sm:table-cell">Marc.</th>
                    <th className="py-3 px-4 text-right text-xs text-slate-500 uppercase hidden sm:table-cell">Clasif.</th>
                    <th className="py-3 px-4 text-right text-xs text-slate-500 uppercase hidden sm:table-cell">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((entry, i) => (
                    <tr key={entry.username} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4"><span className="text-sm font-bold text-slate-400">{i < 3 ? MEDALS[i] : i + 1}</span></td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{entry.name}</div>
                        <div className="text-xs text-slate-600 font-mono">{entry.username}</div>
                      </td>
                      <td className="py-3 px-4 text-right"><span className={`font-black text-lg ${i === 0 ? 'text-amber-400' : 'text-white'}`}>{entry.total}</span></td>
                      <td className="py-3 px-4 text-right hidden sm:table-cell"><span className="text-emerald-400 font-semibold">{entry.matchPts}</span></td>
                      <td className="py-3 px-4 text-right hidden sm:table-cell"><span className="text-blue-400 font-semibold">{entry.classPts}</span></td>
                      <td className="py-3 px-4 text-right hidden sm:table-cell"><span className="text-amber-400 font-semibold">{entry.posPts}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
