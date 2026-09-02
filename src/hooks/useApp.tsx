import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types';

interface AppContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isOffline: boolean;
  setIsOffline: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isOffline: false,
  setIsOffline: () => {},
  reducedMotion: false,
  setReducedMotion: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isOffline, setIsOffline] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // fetch /api/me
      fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => setUser(data))
        .catch(() => { setUser(null); setToken(null); localStorage.removeItem('token'); });
    } else {
      setUser(null);
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = (tok: string, u: User) => {
    setToken(tok);
    setUser(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AppContext.Provider value={{ user, token, login, logout, isOffline, setIsOffline, reducedMotion, setReducedMotion }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
