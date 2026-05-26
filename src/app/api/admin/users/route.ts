import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getUsers, saveUsers, addUser, getUsersByEmpresa, updateUser } from '@/lib/dataStore';
import { randomUUID } from 'crypto';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

function requireAdmin(req: NextRequest) {
  const s = getSessionFromRequest(req.headers);
  return s?.role === 'admin' ? s : null;
}

export async function GET(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const users = getUsersByEmpresa(session.empresaSlug)
    .filter(u => u.role === 'participant')
    .map(u => ({ id: u.id, username: u.username, displayName: u.displayName, active: u.active, createdAt: u.createdAt }));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { action, ...body } = await req.json();
  const slug = session.empresaSlug;

  if (action === 'create') {
    const { firstName, lastName } = body as { firstName: string; lastName: string };
    if (!firstName || !lastName)
      return NextResponse.json({ error: 'Nombre y apellido requeridos' }, { status: 400 });

    const username = normalize(firstName) + normalize(lastName) + slug;
    const allUsers = getUsers();
    if (allUsers.some(u => u.username === username))
      return NextResponse.json({ error: `El usuario "${username}" ya existe`, username }, { status: 409 });

    const defaultPassword = `${slug}2026`;
    addUser({
      id: randomUUID(),
      username,
      password: defaultPassword,
      displayName: `${firstName} ${lastName}`,
      role: 'participant',
      empresaSlug: slug,
      active: true,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, username, password: defaultPassword });
  }

  if (action === 'toggle') {
    const { id } = body as { id: string };
    const user = getUsers().find(u => u.id === id && u.empresaSlug === slug);
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    updateUser(id, { active: !user.active });
    return NextResponse.json({ ok: true });
  }

  if (action === 'rename') {
    const { id, displayName } = body as { id: string; displayName: string };
    if (!displayName) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    updateUser(id, { displayName });
    return NextResponse.json({ ok: true });
  }

  if (action === 'resetPassword') {
    const { id } = body as { id: string };
    const user = getUsers().find(u => u.id === id && u.empresaSlug === slug);
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    const defaultPassword = `${slug}2026`;
    updateUser(id, { password: defaultPassword });
    return NextResponse.json({ ok: true, password: defaultPassword });
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}
