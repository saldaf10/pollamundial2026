import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getUsersByEmpresa, getAllScorePredictions,
         getAllGroupPredictions, getResults, getGroupStandings, getR32Teams } from '@/lib/dataStore';
import { calcMatchPoints, calcGroupPositionPoints, computeKnockoutPoints } from '@/lib/scoring';
import { ALL_MATCHES, GROUPS } from '@/lib/matchData';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const slug = session.empresaSlug;
  const [participants, allScorePreds, allGroupPreds, results, standings, r32Teams] = await Promise.all([
    getUsersByEmpresa(slug),
    getAllScorePredictions(slug),
    getAllGroupPredictions(slug),
    getResults(),
    getGroupStandings(),
    getR32Teams(),
  ]);

  const matchById = new Map(ALL_MATCHES.map(m => [String(m.id), m]));

  const ranking = participants
    .filter(u => u.role === 'participant' && u.active)
    .map(u => {
      const scorePreds = allScorePreds[u.username] || {};
      const groupPreds = allGroupPreds[u.username] || {};
      let groupMatchPts = 0, posPts = 0;

      // Marcadores de fase de grupos
      for (const [mid, res] of Object.entries(results)) {
        if (!res.played) continue;
        const match = matchById.get(mid);
        if (!match || match.round !== 'group') continue;
        const pred = scorePreds[mid];
        if (!pred) continue;
        groupMatchPts += calcMatchPoints(pred, res, match.round);
      }
      // Clasificados por grupo (1°/2°/3°)
      for (const group of GROUPS) {
        const actual = standings[group], predicted = groupPreds[group];
        if (!actual || !predicted) continue;
        posPts += calcGroupPositionPoints(predicted, actual);
      }
      // Mata-mata (bracket que fluye)
      const ko = computeKnockoutPoints(r32Teams, results, scorePreds);

      const matchPts = groupMatchPts + ko.score; // Marcadores (grupos + mata-mata)
      const classPts = ko.advance;               // Equipo que avanza / campeón
      return { username: u.username, name: u.displayName, total: matchPts + classPts + posPts, matchPts, classPts, posPts };
    });

  ranking.sort((a, b) => b.total - a.total || b.matchPts - a.matchPts || b.classPts - a.classPts);
  return NextResponse.json({ ranking });
}
