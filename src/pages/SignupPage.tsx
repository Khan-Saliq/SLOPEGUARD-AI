import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../hooks/useApp';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'authority'>('citizen');
  const [error, setError] = useState<string | null>(null);
  const { login } = useApp();
  const nav = useNavigate();

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      login(data.token, data.user);
      nav(data.user.role === 'authority' ? '/dashboard' : '/citizen');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-4 py-12">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
            <img src="/logo.png" alt="SLOPEGUARD AI" className="h-12 w-12 object-contain drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">SLOPEGUARD AI</h2>
            <p className="text-xs text-slate-400">Create an account to continue</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-900/60 border border-red-700/50 px-3 py-2 text-sm text-red-200">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Full Name</label>
            <input
              className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-colors"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Email Address</label>
            <input
              type="email"
              className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a secure password"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('citizen')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  role === 'citizen' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                Citizen Portal
              </button>
              <button
                type="button"
                onClick={() => setRole('authority')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  role === 'authority' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                Authority Command
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
