'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router   = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Si ya tiene sesión, redirige directo
  useEffect(() => {
    const token = localStorage.getItem('wc26_token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { 'x-session-token': token } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const role = data.user.role;
        if (role === 'superadmin') router.replace('/superadmin');
        else if (role === 'admin') router.replace('/admin');
        else router.replace('/predict');
      });
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return; }

      localStorage.setItem('wc26_token', data.token);
      localStorage.setItem('wc26_user', JSON.stringify({
        username: data.username, displayName: data.displayName,
        role: data.role, empresaSlug: data.empresaSlug,
      }));

      if (data.role === 'superadmin') router.push('/superadmin');
      else if (data.role === 'admin')  router.push('/admin');
      else router.push('/predict');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      <div className="text-center mb-10 fade-in">
        <div className="text-7xl mb-4">🏆</div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-3">
          <span className="gradient-text">POLLA</span>
          <br />
          <span className="text-white">MUNDIAL</span>
          <br />
          <span className="gradient-text">2026</span>
        </h1>
        <p className="text-slate-400 text-sm mt-3">USA · Canadá · México · 11 Jun — 19 Jul</p>
        <div className="flex justify-center gap-3 mt-3 text-3xl">🇺🇸 🇨🇦 🇲🇽</div>
      </div>

      <div className="glass rounded-2xl p-8 w-full max-w-sm fade-in">
        <h2 className="text-xl font-bold text-center mb-6 text-white">Iniciar sesión</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1.5">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="tu usuario"
              autoComplete="username"
              className="w-full bg-white/5 border-2 border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-white/5 border-2 border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center fade-in">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="btn-primary text-base py-4 mt-1"
          >
            {loading ? 'Ingresando...' : 'ENTRAR'}
          </button>
        </form>
      </div>

      <p className="text-slate-700 text-xs mt-8">48 países · 104 partidos · 12 grupos</p>
    </main>
  );
}
