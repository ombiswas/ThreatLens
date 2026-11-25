import axios from "axios";
import { env } from "../utils/env.js";

const TOKEN_STORAGE_KEY = "cybershield_token";

let inMemoryToken = null;
let unauthorizedCallbacks = [];
let serverWakingCallbacks = [];
let pendingRequestsCount = 0;
let coldStartTimer = null;
let isServerWakingState = false;
let hasServerAwakened = false;

export const isLocalEnvironment = () => {
  try {
    if (env.VITE_APP_ENV === "development") return true;
    if (env.VITE_API_URL?.includes("localhost") || env.VITE_API_URL?.includes("127.0.0.1")) {
      return true;
    }
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    }
  } catch {
    // fallback
  }
  return false;
};

export const getAuthToken = () => {
  if (inMemoryToken) return inMemoryToken;
  try {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  } catch {
    // sessionStorage might be restricted
  }
  return null;
};

export const setAuthToken = (token) => {
  inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage access errors
  }
};

export const clearAuthToken = () => {
  setAuthToken(null);
};

export const onUnauthorized = (callback) => {
  unauthorizedCallbacks.push(callback);
  return () => {
    unauthorizedCallbacks = unauthorizedCallbacks.filter((cb) => cb !== callback);
  };
};

export const onServerWakingChange = (callback) => {
  serverWakingCallbacks.push(callback);
  callback(isServerWakingState);
  return () => {
    serverWakingCallbacks = serverWakingCallbacks.filter((cb) => cb !== callback);
  };
};

const notifyServerWaking = (isWaking) => {
  if (isServerWakingState !== isWaking) {
    isServerWakingState = isWaking;
    serverWakingCallbacks.forEach((cb) => cb(isWaking));
  }
};

const trackRequestStart = () => {
  pendingRequestsCount += 1;
  // Local servers and servers that have already returned responses are not sleeping
  if (isLocalEnvironment() || hasServerAwakened) {
    return;
  }
  if (!coldStartTimer) {
    coldStartTimer = setTimeout(() => {
      if (pendingRequestsCount > 0 && !hasServerAwakened && !isLocalEnvironment()) {
        notifyServerWaking(true);
      }
    }, 4000);
  }
};

const trackRequestEnd = () => {
  pendingRequestsCount = Math.max(0, pendingRequestsCount - 1);
  if (pendingRequestsCount === 0 || hasServerAwakened || isLocalEnvironment()) {
    if (coldStartTimer) {
      clearTimeout(coldStartTimer);
      coldStartTimer = null;
    }
    notifyServerWaking(false);
  }
};

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use(
  (config) => {
    trackRequestStart();
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    trackRequestEnd();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    hasServerAwakened = true;
    if (isServerWakingState) {
      notifyServerWaking(false);
    }
    trackRequestEnd();
    // Unwrap standard JSend envelope { status: "success", data: ... }
    if (response.data && response.data.status === "success" && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status) {
      hasServerAwakened = true;
      if (isServerWakingState) {
        notifyServerWaking(false);
      }
    }
    trackRequestEnd();

    const status = error.response ? error.response.status : 0;
    const errorBody = error.response?.data?.error;

    if (status === 401) {
      clearAuthToken();
      unauthorizedCallbacks.forEach((cb) => cb());
    }

    const normalizedError = {
      status,
      code: errorBody?.code || (status === 0 ? "NETWORK_ERROR" : "API_ERROR"),
      message:
        errorBody?.message ||
        (status === 0
          ? "Unable to reach the server. Please check your connection or wait if the host is waking up."
          : error.message || "An unexpected error occurred"),
      details: errorBody?.details || null
    };

    return Promise.reject(normalizedError);
  }
);
