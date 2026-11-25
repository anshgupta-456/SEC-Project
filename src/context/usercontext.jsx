import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { SESSION_KEY, setUnauthorizedHandler } from '../api';

export const userContext = createContext({});

function loadSession() {
  localStorage.removeItem('user'); // pre-auth versions stored the profile here
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session?.token && session?.user) return session;
  } catch {
    // ignore malformed storage
  }
  return null;
}

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export const UserContextProvider = ({ children }) => {
  const [session, setSession] = useState(loadSession);

  const login = useCallback((token, user) => {
    const next = { token, user };
    saveSession(next);
    setSession(next);
  }, []);

  // Merge updated profile fields (e.g. after editing the profile).
  const setUser = useCallback((user) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: { ...prev.user, ...user } };
      saveSession(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  // Any API call that comes back 401 (expired/invalid token) logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(() => {
    const User = session?.user ?? {};
    return { User, isLoggedIn: Boolean(session), isAdmin: Boolean(User.isAdmin), login, setUser, logout };
  }, [session, login, setUser, logout]);

  return <userContext.Provider value={value}>{children}</userContext.Provider>;
};
