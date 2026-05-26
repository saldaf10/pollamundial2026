import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Usa el endpoint /api/[empresa]/admin/codes' }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: 'Usa el endpoint /api/[empresa]/admin/codes' }, { status: 410 });
}
