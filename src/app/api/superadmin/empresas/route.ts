import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getEmpresas, addEmpresa, getEmpresa, deleteEmpresa,
         getUsersByEmpresa, addUser, updateUser, updateEmpresaName, deleteUsersByEmpresa,
         deletePredictionsByEmpresa } from '@/lib/dataStore';
import { randomUUID } from 'crypto';

const RESERVED = new Set(['superadmin', 'admin', 'api', 'predict', 'leaderboard',
                          'login', 'change-password', '_next', 'public', 'static']);

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (session?.role !== 'superadmin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const empresas = await getEmpresas();
  const result = await Promise.all(empresas.map(async e => ({
    ...e,
    adminUser: (await getUsersByEmpresa(e.slug)).find(u => u.role === 'admin'),
  })));
  return NextResponse.json({ empresas: result });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (session?.role !== 'superadmin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

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
    if (await getEmpresa(slug)) return NextResponse.json({ error: 'Ya existe una empresa con ese nombre' }, { status: 409 });

    await addEmpresa({ id: randomUUID(), slug, name, createdAt: new Date().toISOString() });
    await addUser({
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
    const empresas = await getEmpresas();
    const empresa  = empresas.find(e => e.id === id);
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    await deletePredictionsByEmpresa(empresa.slug);
    await deleteUsersByEmpresa(empresa.slug);
    await deleteEmpresa(id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const { id, name, adminPassword } = body as { id: string; name?: string; adminPassword?: string };
    const empresas = await getEmpresas();
    const empresa  = empresas.find(e => e.id === id);
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    if (name) await updateEmpresaName(id, name);
    if (adminPassword) {
      const admin = (await getUsersByEmpresa(empresa.slug)).find(u => u.role === 'admin');
      if (admin) await updateUser(admin.id, { password: adminPassword });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}
