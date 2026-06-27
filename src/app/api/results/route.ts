import { NextRequest, NextResponse } from 'next/server';
import { getResults, setMatchResult, setMatchLocked, getGroupStandings, setGroupStanding,
         setThirdClassified, getR32Teams, setR32Team, getSessionFromRequest } from '@/lib/dataStore';

export async function GET() {
  return NextResponse.json({
    results: await getResults(),
    standings: await getGroupStandings(),
    r32Teams: await getR32Teams(),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (session?.role !== 'superadmin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();

  if (body.type === 'group_standing') {
    const { group, first, second, third, thirdClassified } = body;
    if (!group || !first || !second)
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    await setGroupStanding(group, first, second, third || undefined, thirdClassified || false);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'set_third_classified') {
    const { group, thirdClassified } = body;
    if (!group) return NextResponse.json({ error: 'grupo requerido' }, { status: 400 });
    await setThirdClassified(group, Boolean(thirdClassified));
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'r32_team') {
    const { matchId, home, away } = body;
    if (matchId === undefined || !home || !away)
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    await setR32Team(Number(matchId), String(home), String(away));
    return NextResponse.json({ ok: true });
  }

  const { matchId, home, away, locked, winner } = body;
  if (matchId === undefined)
    return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
  if (home !== undefined && away !== undefined) {
    await setMatchResult(Number(matchId), Number(home), Number(away), winner || undefined);
  } else if (locked !== undefined) {
    await setMatchLocked(Number(matchId), Boolean(locked));
  }
  return NextResponse.json({ ok: true });
}
