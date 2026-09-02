import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useApp();
  const nav = useNavigate();

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      login(data.token, data.user);
      nav('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/70 border border-border shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent overflow-hidden">
            <img src="/logo.png" alt="SLOPEGUARD AI" className="h-12 w-12 object-contain drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">SLOPEGUARD AI</h2>
            <p className="text-xs text-slate-400">Risk Monitor · Sign in to continue</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-900/60 px-3 py-2 text-sm text-red-300">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Email</label>
            <input
              className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-2 block">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer">
            Sign in
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <a href="/signup" className="text-cyan-400 font-semibold hover:underline">
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
