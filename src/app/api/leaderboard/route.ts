import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getUsersByEmpresa, getAllScorePredictions,
         getAllGroupPredictions, getResults, getGroupStandings } from '@/lib/dataStore';
import { calcMatchPoints, calcClassifiedPoints, calcGroupPositionPoints, ROUND_RULES } from '@/lib/scoring';
import { ALL_MATCHES, GROUPS } from '@/lib/matchData';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const slug = session.empresaSlug;
  const [participants, allScorePreds, allGroupPreds, results, standings] = await Promise.all([
    getUsersByEmpresa(slug),
    getAllScorePredictions(slug),
    getAllGroupPredictions(slug),
    getResults(),
    getGroupStandings(),
  ]);

  const matchById = new Map(ALL_MATCHES.map(m => [String(m.id), m]));

  const ranking = participants
    .filter(u => u.role === 'participant' && u.active)
    .map(u => {
      const scorePreds = allScorePreds[u.username] || {};
      const groupPreds = allGroupPreds[u.username] || {};
      let matchPts = 0, classPts = 0, posPts = 0;

      for (const [mid, res] of Object.entries(results)) {
        if (!res.played) continue;
        const match = matchById.get(mid);
        if (!match) continue;
        const pred = scorePreds[mid];
        if (!pred) continue;
        matchPts += calcMatchPoints(pred, res, match.round);
        if (ROUND_RULES[match.round]?.classified !== undefined || match.round === 'final')
          classPts += calcClassifiedPoints(pred, pred.winner ?? null, res, res.winner ?? null, match.round);
      }
      for (const group of GROUPS) {
        const actual = standings[group], predicted = groupPreds[group];
        if (!actual || !predicted) continue;
        posPts += calcGroupPositionPoints(predicted, actual);
      }
      return { username: u.username, name: u.displayName, total: matchPts + classPts + posPts, matchPts, classPts, posPts };
    });

  ranking.sort((a, b) => b.total - a.total || b.matchPts - a.matchPts || b.classPts - a.classPts);
  return NextResponse.json({ ranking });
}
