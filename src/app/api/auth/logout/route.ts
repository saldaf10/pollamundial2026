import { NextRequest, NextResponse } from 'next/server';
import { removeSession } from '@/lib/dataStore';

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-session-token');
  if (token) await removeSession(token);
  return NextResponse.json({ ok: true });
}
