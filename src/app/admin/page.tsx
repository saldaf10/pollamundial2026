'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserRow { id: string; username: string; displayName: string; active: boolean; createdAt: string; }
interface SessionUser { username: string; displayName: string; role: string; empresaSlug: string; empresaName: string; }

export default function AdminPage() {
  const router = useRouter();
  const [session,    setSession]    = useState<SessionUser | null>(null);
  const [users,      setUsers]      = useState<UserRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [creating,   setCreating]   = useState(false);
  const [createMsg,  setCreateMsg]  = useState<{ username: string; password: string } | null>(null);
  const [createErr,  setCreateErr]  = useState('');
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editName,   setEditName]   = useState('');
  const [resetInfo,  setResetInfo]  = useState<{ username: string; password: string } | null>(null);

  function token() { return localStorage.getItem('wc26_token') || ''; }

  const fetchUsers = useCallback(async () => {
    const r = await fetch('/api/admin/users', { headers: { 'x-session-token': token() } });
    if (r.ok) { const d = await r.json(); setUsers(d.users || []); }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('wc26_token');
    if (!t) { router.push('/'); return; }
    fetch('/api/auth/me', { headers: { 'x-session-token': t } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.user.role !== 'admin') { router.push('/'); return; }
        setSession(data.user);
        setLoading(false);
        fetchUsers();
      });
  }, [router, fetchUsers]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(''); setCreateMsg(null); setCreating(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'create', firstName: firstName.trim(), lastName: lastName.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) { setCreateMsg({ username: data.username, password: data.password }); setFirstName(''); setLastName(''); fetchUsers(); }
    else setCreateErr(data.error || 'Error al crear usuario');
  }

  async function toggleUser(id: string) {
    await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    fetchUsers();
  }

  async function renameUser(id: string) {
    if (!editName.trim()) return;
    await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'rename', id, displayName: editName.trim() }),
    });
    setEditId(null); fetchUsers();
  }

  async function resetPassword(id: string, username: string) {
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ action: 'resetPassword', id }),
    });
    const data = await res.json();
    if (res.ok) setResetInfo({ username, password: data.password });
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-session-token': token() } });
    localStorage.removeItem('wc26_token'); localStorage.removeItem('wc26_user');
    router.push('/');
  }

  function copyAllUsers() {
    const text = users.filter(u => u.active)
      .map(u => `${u.displayName}  |  Usuario: ${u.username}  |  Contraseña: ${session?.empresaSlug}2026`)
      .join('\n');
    navigator.clipboard.writeText(text);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <main className="min-h-screen relative z-10">
      {/* Header */}
      <div className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-black text-white text-sm">⚙️ Admin</div>
            <div className="text-xs text-amber-400">{session?.empresaName}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/leaderboard" className="btn-outline text-xs">🏅 Rankings</Link>
            <Link href="/change-password" className="btn-outline text-xs">🔑 Clave</Link>
            <button onClick={logout} className="btn-outline text-xs text-red-400">Salir</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Crear usuario */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4">Agregar participante</h2>
          <form onSubmit={createUser} className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-32">
              <label className="text-xs text-amber-400 font-bold block mb-1">Nombre</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Juan"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div className="flex-1 min-w-32">
              <label className="text-xs text-amber-400 font-bold block mb-1">Apellido</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="García"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <button type="submit" disabled={creating} className="btn-gold text-sm py-2 px-4 shrink-0">
              {creating ? 'Creando…' : '+ Agregar'}
            </button>
          </form>
          {createErr && <p className="text-red-400 text-sm mt-2">{createErr}</p>}
          {createMsg && (
            <div className="mt-3 glass rounded-xl p-3 border border-emerald-500/30 fade-in">
              <p className="text-emerald-400 text-xs font-bold mb-1">✓ Usuario creado</p>
              <p className="text-white text-sm">
                Usuario: <span className="font-mono text-amber-400">{createMsg.username}</span>
                &nbsp;·&nbsp;
                Contraseña: <span className="font-mono text-amber-400">{createMsg.password}</span>
              </p>
              <p className="text-slate-500 text-xs mt-1">Comparte estos datos con el participante.</p>
            </div>
          )}
        </div>

        {/* Lista usuarios */}
        {users.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">Participantes ({users.length})</h2>
              <div className="flex gap-3 items-center">
                <span className="text-xs text-emerald-400">{users.filter(u => u.active).length} activos</span>
                <button onClick={copyAllUsers} className="btn-outline text-xs py-1 px-2">📋 Copiar todos</button>
              </div>
            </div>
            <div className="divide-y divide-white/5 max-h-[55vh] overflow-y-auto">
              {users.map((u, i) => (
                <div key={u.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors ${!u.active ? 'opacity-40' : ''}`}>
                  <span className="text-slate-600 text-xs w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    {editId === u.id ? (
                      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); renameUser(u.id); }}>
                        <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                          className="flex-1 bg-white/10 border border-amber-400/40 rounded px-2 py-1 text-white text-sm focus:outline-none" />
                        <button type="submit" className="text-emerald-400 text-xs px-2">✓</button>
                        <button type="button" onClick={() => setEditId(null)} className="text-slate-500 text-xs px-2">✕</button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">{u.displayName}</span>
                        <button onClick={() => { setEditId(u.id); setEditName(u.displayName); }}
                          className="text-slate-600 hover:text-slate-400 text-xs">✏️</button>
                      </div>
                    )}
                    <span className="font-mono text-amber-400 text-xs">{u.username}</span>
                  </div>
                  <button onClick={() => resetPassword(u.id, u.username)} title="Resetear contraseña"
                    className="text-xs px-2 py-1 border border-slate-600/30 rounded text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition-colors">
                    🔑
                  </button>
                  <button onClick={() => toggleUser(u.id)}
                    className={`text-xs px-2 py-1 rounded font-bold border transition-all ${
                      u.active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                        : 'bg-slate-700/30 border-slate-600/30 text-slate-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset info popup */}
        {resetInfo && (
          <div className="glass rounded-xl p-4 border border-amber-500/30 fade-in">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-400 text-sm font-bold">🔑 Contraseña reseteada</p>
                <p className="text-white text-sm mt-1">
                  <span className="font-mono">{resetInfo.username}</span> → nueva clave: <span className="font-mono text-amber-400">{resetInfo.password}</span>
                </p>
              </div>
              <button onClick={() => setResetInfo(null)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
