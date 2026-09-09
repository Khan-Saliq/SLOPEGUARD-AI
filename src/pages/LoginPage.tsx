import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { getApiUrl } from '../lib/utils';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; area?: string; city?: string; district?: string; state?: string; accuracy?: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const { login } = useApp();
  const nav = useNavigate();

  useEffect(() => {
    if ('geolocation' in navigator) {
      setLocLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));

          let area = 'Shillong Sector';
          let city = 'Shillong';
          let district = 'East Khasi Hills';
          let state = 'Meghalaya';

          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const addr = geoData.address || {};
              area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.road || addr.quarter || area;
              city = addr.city || addr.town || addr.city_district || addr.state_district || addr.county || city;
              district = addr.state_district || addr.county || district;
              if (addr.state) state = addr.state;
            }
          } catch (e) {}

          const fullLocationName = `${area}, ${city}`;
          setLocation({
            lat,
            lng,
            accuracy: Math.round(pos.coords.accuracy),
            area: fullLocationName,
            district,
            state
          });
          setLocLoading(false);
        },
        (err) => {
          console.warn('Geolocation warning on login:', err.message);
          setLocation({
            lat: 25.5788,
            lng: 91.8933,
            area: 'Shillong Hill Sector, Shillong'
          });
          setLocLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    try {
      if (!email || !password) throw new Error('Please enter email and password');
      const url = getApiUrl('/api/login');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, location })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || data?.message || `Login failed (${res.status})`;
        throw new Error(msg);
      }
      login(data.token, data.user);
      nav(data.user?.role === 'authority' ? '/dashboard' : '/citizen');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700 overflow-hidden">
            <img src="/logo.png" alt="Giri Raksha" className="h-10 w-10 object-contain drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Giri Raksha</h2>
            <p className="text-xs text-slate-400">Landslide Warning System · Sign in</p>
          </div>
        </div>

        {/* Location Status Indicator */}
        <div className="mb-5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">
                {location?.area ? `Location Acquired: ${location.area}` : locLoading ? 'Detecting City & Area Location...' : 'Shillong Hill Sector, Shillong'}
              </p>
              {location?.accuracy && (
                <p className="text-[10px] text-slate-400">GPS Precision: ±{location.accuracy}m</p>
              )}
            </div>
          </div>
          {location && <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />}
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-950/80 border border-red-800 px-3.5 py-2.5 text-xs font-medium text-red-200">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Email Address</label>
            <input
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
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-slate-950" />
            Sign in & Sync Location
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
