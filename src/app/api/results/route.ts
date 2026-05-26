import { NextRequest, NextResponse } from 'next/server';
import { getResults, setMatchResult, setMatchLocked, getGroupStandings, setGroupStanding,
         getSessionFromRequest } from '@/lib/dataStore';

export async function GET() {
  return NextResponse.json({ results: getResults(), standings: getGroupStandings() });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req.headers);
  if (session?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();

  if (body.type === 'group_standing') {
    const { group, first, second } = body;
    if (!group || !first || !second)
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    setGroupStanding(group, first, second);
    return NextResponse.json({ ok: true });
  }

  const { matchId, home, away, locked, winner } = body;
  if (matchId === undefined)
    return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
  if (home !== undefined && away !== undefined) {
    setMatchResult(Number(matchId), Number(home), Number(away), winner || undefined);
    setMatchLocked(Number(matchId), true);
  } else if (locked !== undefined) {
    setMatchLocked(Number(matchId), Boolean(locked));
  }
  return NextResponse.json({ ok: true });
}
