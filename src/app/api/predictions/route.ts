import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getScorePredictions, saveScorePrediction,
         getGroupPredictions, saveGroupPrediction, getResults } from '@/lib/dataStore';
import { GROUP_MATCHES } from '@/lib/matchData';
import { predictionsAreClosed } from '@/lib/config';

const GROUP_MATCH_IDS = new Set(GROUP_MATCHES.map(m => String(m.id)));

const CLOSED_RESPONSE = NextResponse.json(
  { error: 'El plazo de pronósticos cerró el 11 de junio. Ya no se pueden hacer cambios.' },
  { status: 403 }
);

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (!session || session.role !== 'participant')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json({
    predictions: await getScorePredictions(session.empresaSlug, session.username),
    groupPredictions: await getGroupPredictions(session.empresaSlug, session.username),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (!session || session.role !== 'participant')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (predictionsAreClosed()) return CLOSED_RESPONSE;

  const body = await req.json();
  const { type } = body;

  if (type === 'group_position') {
    const { group, first, second, third } = body;
    if (!group || !first || !second)
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    await saveGroupPrediction(session.empresaSlug, session.username, group, { first, second, third: third || undefined });
    return NextResponse.json({ ok: true });
  }

  const { matchId, home, away, winner } = body;
  if (matchId === undefined)
    return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
  if (!GROUP_MATCH_IDS.has(String(matchId)))
    return NextResponse.json({ error: 'Solo se permiten pronósticos de fase de grupos' }, { status: 403 });
  const results = await getResults();
  if (results[String(matchId)]?.locked)
    return NextResponse.json({ error: 'Partido bloqueado' }, { status: 403 });
  await saveScorePrediction(session.empresaSlug, session.username, Number(matchId),
    { home: Number(home), away: Number(away), ...(winner ? { winner } : {}) });
  return NextResponse.json({ ok: true });
}
