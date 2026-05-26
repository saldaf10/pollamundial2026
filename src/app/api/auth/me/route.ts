import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getEmpresa } from '@/lib/dataStore';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req.headers);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const empresa = session.empresaSlug ? getEmpresa(session.empresaSlug) : null;

  return NextResponse.json({
    user: {
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      empresaSlug: session.empresaSlug,
      empresaName: empresa?.name ?? '',
    },
  });
}
