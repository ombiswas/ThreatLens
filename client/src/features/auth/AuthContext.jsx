import React, { useState, useEffect, useCallback } from "react";
import {
  api,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  onUnauthorized
} from "../../services/api.js";
import { connectSocket, disconnectSocket } from "../../services/socket.js";
import { AuthContext } from "./authContextDef.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize 401 unauthorizations from the axios interceptor
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
      setTokenState(null);
      disconnectSocket();
    });
    return unsubscribe;
  }, []);

  // Restore session on mount if token exists in sessionStorage
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const existingToken = getAuthToken();
      if (!existingToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await api.get("/api/auth/me");
        if (isMounted) {
          setUser(response.user);
          setTokenState(existingToken);
          connectSocket();
        }
      } catch {
        // Token invalid or expired
        if (isMounted) {
          clearAuthToken();
          setUser(null);
          setTokenState(null);
          disconnectSocket();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await api.post("/api/auth/login", { email, password });
    setAuthToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    connectSocket();
    return data;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const data = await api.post("/api/auth/register", { name, email, password });
    setAuthToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    connectSocket();
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Best-effort logout
    } finally {
      clearAuthToken();
      setTokenState(null);
      setUser(null);
      disconnectSocket();
    }
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
