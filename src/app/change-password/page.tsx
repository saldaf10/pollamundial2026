'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [role,       setRole]       = useState('');
  const [current,    setCurrent]    = useState('');
  const [next,       setNext]       = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  function token() { return localStorage.getItem('wc26_token') || ''; }

  function backLink() {
    if (role === 'superadmin') return '/superadmin';
    if (role === 'admin')      return '/admin';
    return '/predict';
  }

  useEffect(() => {
    const t = token();
    if (!t) { router.push('/'); return; }
    fetch('/api/auth/me', { headers: { 'x-session-token': t } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push('/'); return; }
        setRole(data.user.role);
        setLoading(false);
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError('Las contraseñas nuevas no coinciden'); return; }
    if (next.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token() },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setSaving(false);
    if (res.ok) { setSuccess(true); setCurrent(''); setNext(''); setConfirm(''); }
    else { const d = await res.json(); setError(d.error || 'Error al cambiar contraseña'); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="glass rounded-2xl p-8 w-full max-w-sm fade-in">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-xl font-black text-white">Cambiar contraseña</h1>
        </div>

        {success ? (
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-emerald-400 font-bold mb-4">Contraseña actualizada</p>
            <Link href={backLink()} className="btn-primary text-sm inline-block">Volver</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Contraseña actual</label>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required
                className="w-full bg-white/5 border-2 border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Nueva contraseña</label>
              <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={6}
                className="w-full bg-white/5 border-2 border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full bg-white/5 border-2 border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all" />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={saving} className="btn-primary py-3">
              {saving ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
            <Link href={backLink()} className="text-slate-600 hover:text-slate-400 text-sm text-center transition-colors">
              ← Cancelar
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
