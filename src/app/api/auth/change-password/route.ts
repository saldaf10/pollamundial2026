import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getUserByUsername, updateUser } from '@/lib/dataStore';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req.headers);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  if (newPassword.length < 6)
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

  const user = await getUserByUsername(session.username);
  if (!user || user.password !== currentPassword)
    return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 });

  await updateUser(user.id, { password: newPassword });
  return NextResponse.json({ ok: true });
}
