import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionFromRequest, getUsersByEmpresa,
  getAllScorePredictions, getAllGroupPredictions,
  getScorePredictions, getGroupPredictions,
  getResults, getGroupStandings,
} from '@/lib/dataStore';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (session?.role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const slug = session.empresaSlug;
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (username) {
    const [predictions, groupPredictions, results, standings] = await Promise.all([
      getScorePredictions(slug, username),
      getGroupPredictions(slug, username),
      getResults(),
      getGroupStandings(),
    ]);
    return NextResponse.json({ predictions, groupPredictions, results, standings });
  }

  const [allScorePreds, allGroupPreds, participants] = await Promise.all([
    getAllScorePredictions(slug),
    getAllGroupPredictions(slug),
    getUsersByEmpresa(slug),
  ]);

  const completeness: Record<string, { scorePredCount: number; groupPredCount: number }> = {};
  for (const u of participants.filter(p => p.role === 'participant' && p.active)) {
    completeness[u.username] = {
      scorePredCount: Object.keys(allScorePreds[u.username] || {}).length,
      groupPredCount: Object.keys(allGroupPreds[u.username] || {}).length,
    };
  }
  return NextResponse.json({ completeness });
}
