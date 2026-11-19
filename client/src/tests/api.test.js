import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  api,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  onUnauthorized,
  onServerWakingChange
} from "../services/api.js";

describe("API Service & Interceptors", () => {
  beforeEach(() => {
    clearAuthToken();
    vi.clearAllMocks();
  });

  it("stores and retrieves token in memory and sessionStorage", () => {
    setAuthToken("test-jwt-token-12345");
    expect(getAuthToken()).toBe("test-jwt-token-12345");
    expect(sessionStorage.getItem("cybershield_token")).toBe("test-jwt-token-12345");

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
    expect(sessionStorage.getItem("cybershield_token")).toBeNull();
  });

  it("attaches Authorization header when token is present", async () => {
    setAuthToken("sample-token-abc");

    const requestSpy = vi.fn((config) => {
      expect(config.headers.Authorization).toBe("Bearer sample-token-abc");
      return Promise.resolve({ data: { success: true }, status: 200 });
    });

    // Mock axios adapter or internal handler
    const originalAdapter = api.defaults.adapter;
    api.defaults.adapter = requestSpy;

    try {
      await api.get("/test-endpoint");
      expect(requestSpy).toHaveBeenCalled();
    } finally {
      api.defaults.adapter = originalAdapter;
    }
  });

  it("clears token and notifies onUnauthorized listeners when 401 response occurs", async () => {
    setAuthToken("expired-token");

    const unauthorizedSpy = vi.fn();
    const unsubscribe = onUnauthorized(unauthorizedSpy);

    const mock401Adapter = vi.fn(() =>
      Promise.reject({
        response: {
          status: 401,
          data: {
            error: {
              code: "AUTH_EXPIRED",
              message: "Token expired"
            }
          }
        }
      })
    );

    const originalAdapter = api.defaults.adapter;
    api.defaults.adapter = mock401Adapter;

    try {
      await expect(api.get("/protected")).rejects.toMatchObject({
        status: 401,
        code: "AUTH_EXPIRED",
        message: "Token expired"
      });

      expect(getAuthToken()).toBeNull();
      expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
      api.defaults.adapter = originalAdapter;
    }
  });

  it("normalizes network errors cleanly into structured shape", async () => {
    const mockNetworkErrorAdapter = vi.fn(() =>
      Promise.reject({
        message: "Network Error"
      })
    );

    const originalAdapter = api.defaults.adapter;
    api.defaults.adapter = mockNetworkErrorAdapter;

    try {
      await expect(api.get("/down-server")).rejects.toMatchObject({
        status: 0,
        code: "NETWORK_ERROR"
      });
    } finally {
      api.defaults.adapter = originalAdapter;
    }
  });

  it("registers server waking subscriber without errors", () => {
    const listener = vi.fn();
    const unsub = onServerWakingChange(listener);
    expect(listener).toHaveBeenCalledWith(false);
    unsub();
  });
});
