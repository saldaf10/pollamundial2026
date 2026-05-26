import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, addSession } from '@/lib/dataStore';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password)
    return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });

  const user = await getUserByUsername(username.trim().toLowerCase());
  if (!user || !user.active || user.password !== password)
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });

  const token = randomUUID();
  await addSession({
    token,
    userId: user.id,
    username: user.username,
    role: user.role,
    empresaSlug: user.empresaSlug,
    displayName: user.displayName,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    token,
    role: user.role,
    username: user.username,
    displayName: user.displayName,
    empresaSlug: user.empresaSlug,
  });
}
