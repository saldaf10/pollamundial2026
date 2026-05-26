import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Usa el endpoint /api/[empresa]/validate-code' }, { status: 410 });
}
