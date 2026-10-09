import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, refreshSession, setSessionLostHandler, setToken } from "../lib/api.js";
import { disconnectSocket } from "../lib/socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On every page load, try to restore the session from the refresh cookie.
  useEffect(() => {
    setSessionLostHandler(() => {
      setToken(null);
      setUser(null);
    });
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback((data) => {
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => startSession(await api.post("/api/auth/login", { email, password })), [startSession]);
  const register = useCallback(
    async (name, email, password) => startSession(await api.post("/api/auth/register", { name, email, password })),
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* even if the request fails, forget the session locally */
    }
    disconnectSocket();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
