import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiFetch, getStoredToken, setStoredToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());

  const loginWithToken = useCallback((newToken) => {
    setStoredToken(newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      loginWithToken,
      logout,
      async signup(email, password) {
        const { data } = await apiFetch("/auth/signup", {
          method: "POST",
          json: true,
          body: { email, password },
          auth: false,
        });
        if (!data?.access_token) throw new Error("Unexpected signup response");
        loginWithToken(data.access_token);
      },
      async login(email, password) {
        const { data } = await apiFetch("/auth/login", {
          method: "POST",
          json: true,
          body: { email, password },
          auth: false,
        });
        if (!data?.access_token) throw new Error("Unexpected login response");
        loginWithToken(data.access_token);
      },
    }),
    [token, loginWithToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
