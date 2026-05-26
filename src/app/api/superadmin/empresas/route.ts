import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getEmpresas, saveEmpresas, addEmpresa, getEmpresa,
         getUsers, saveUsers, addUser, getUsersByEmpresa } from '@/lib/dataStore';
import { randomUUID } from 'crypto';

const RESERVED = new Set(['superadmin', 'admin', 'api', 'predict', 'leaderboard',
                          'login', 'change-password', '_next', 'public', 'static']);

function requireSuperAdmin(req: NextRequest) {
  const s = getSessionFromRequest(req.headers);
  return s?.role === 'superadmin' ? s : null;
}

export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const empresas = getEmpresas().map(e => ({
    ...e,
    adminUsername: `admin${e.slug}`,
    adminUser: getUsersByEmpresa(e.slug).find(u => u.role === 'admin'),
  }));
  return NextResponse.json({ empresas });
}

export async function POST(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { action, ...body } = await req.json();

  if (action === 'create') {
    const { name, adminPassword } = body as { name: string; adminPassword: string };
    if (!name || !adminPassword)
      return NextResponse.json({ error: 'name y adminPassword son requeridos' }, { status: 400 });

    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
    if (RESERVED.has(slug)) return NextResponse.json({ error: 'Nombre reservado, elige otro' }, { status: 400 });
    if (getEmpresa(slug)) return NextResponse.json({ error: 'Ya existe una empresa con ese nombre' }, { status: 409 });

    addEmpresa({ id: randomUUID(), slug, name, createdAt: new Date().toISOString() });
    addUser({
      id: randomUUID(),
      username: `admin${slug}`,
      password: adminPassword,
      displayName: `Admin ${name}`,
      role: 'admin',
      empresaSlug: slug,
      active: true,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, slug, adminUsername: `admin${slug}` });
  }

  if (action === 'delete') {
    const { id } = body as { id: string };
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const empresa = getEmpresas().find(e => e.id === id);
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    saveEmpresas(getEmpresas().filter(e => e.id !== id));
    saveUsers(getUsers().filter(u => u.empresaSlug !== empresa.slug));
    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const { id, name, adminPassword } = body as { id: string; name?: string; adminPassword?: string };
    const all = getEmpresas();
    const idx = all.findIndex(e => e.id === id);
    if (idx < 0) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    if (name) all[idx].name = name;
    saveEmpresas(all);
    if (adminPassword) {
      const users = getUsers();
      const admin = users.find(u => u.empresaSlug === all[idx].slug && u.role === 'admin');
      if (admin) { admin.password = adminPassword; saveUsers(users); }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}
