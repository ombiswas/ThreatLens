import axios from "axios";
import { env } from "../utils/env.js";

const TOKEN_STORAGE_KEY = "cybershield_token";

let inMemoryToken = null;
let unauthorizedCallbacks = [];
let serverWakingCallbacks = [];
let pendingRequestsCount = 0;
let coldStartTimer = null;
let isServerWakingState = false;

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
  if (!coldStartTimer) {
    coldStartTimer = setTimeout(() => {
      if (pendingRequestsCount > 0) {
        notifyServerWaking(true);
      }
    }, 4000);
  }
};

const trackRequestEnd = () => {
  pendingRequestsCount = Math.max(0, pendingRequestsCount - 1);
  if (pendingRequestsCount === 0) {
    if (coldStartTimer) {
      clearTimeout(coldStartTimer);
      coldStartTimer = null;
    }
    notifyServerWaking(false);
  }
};

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 15000,
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
    trackRequestEnd();
    // Unwrap standard JSend envelope { status: "success", data: ... }
    if (response.data && response.data.status === "success" && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
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
