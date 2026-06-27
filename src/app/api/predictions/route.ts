import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getScorePredictions, saveScorePrediction,
         getGroupPredictions, saveGroupPrediction, getResults } from '@/lib/dataStore';
import { GROUP_MATCHES, KNOCKOUT_MATCH_IDS } from '@/lib/matchData';
import { predictionsAreClosed, groupPosAreClosed, knockoutAreClosed } from '@/lib/config';

const GROUP_MATCH_IDS = new Set(GROUP_MATCHES.map(m => String(m.id)));
const KO_MATCH_IDS = new Set(KNOCKOUT_MATCH_IDS.map(String));

const CLOSED_RESPONSE = NextResponse.json(
  { error: 'El plazo de pronósticos cerró el 11 de junio. Ya no se pueden hacer cambios.' },
  { status: 403 }
);

const GROUP_POS_CLOSED_RESPONSE = NextResponse.json(
  { error: 'El plazo para clasificados cerró al inicio del primer partido.' },
  { status: 403 }
);

const KO_CLOSED_RESPONSE = NextResponse.json(
  { error: 'El plazo de pronósticos del mata-mata ya cerró.' },
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

  const body = await req.json();
  const { type } = body;

  if (type === 'group_position') {
    if (groupPosAreClosed()) return GROUP_POS_CLOSED_RESPONSE;
    const { group, first, second, third } = body;
    if (!group || !first || !second)
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    await saveGroupPrediction(session.empresaSlug, session.username, group, { first, second, third: third || undefined });
    return NextResponse.json({ ok: true });
  }

  const { matchId, home, away, winner } = body;
  if (matchId === undefined)
    return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });

  const mid = String(matchId);
  const isGroup = GROUP_MATCH_IDS.has(mid);
  const isKnockout = KO_MATCH_IDS.has(mid);
  if (!isGroup && !isKnockout)
    return NextResponse.json({ error: 'Partido inválido' }, { status: 403 });
  if (isGroup && predictionsAreClosed()) return CLOSED_RESPONSE;
  if (isKnockout && knockoutAreClosed()) return KO_CLOSED_RESPONSE;

  const results = await getResults();
  if (results[mid]?.locked)
    return NextResponse.json({ error: 'Partido bloqueado' }, { status: 403 });
  await saveScorePrediction(session.empresaSlug, session.username, Number(matchId),
    { home: Number(home), away: Number(away), ...(winner ? { winner } : {}) });
  return NextResponse.json({ ok: true });
}
