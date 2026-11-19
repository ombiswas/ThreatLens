import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.jsx";
import { RoleRoute } from "../features/auth/RoleRoute.jsx";
import { AuthContext } from "../features/auth/authContextDef.js";

describe("Route Guards (ProtectedRoute & RoleRoute)", () => {
  const renderWithRouter = (initialRoute, authState = {}) => {
    const authValue = {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      ...authState
    };

    return render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<div>Login Page Screen</div>} />
            <Route path="/dashboard" element={<div>Dashboard Screen</div>} />

            <Route element={<ProtectedRoute />}>
              <Route path="/protected-area" element={<div>Protected Operational Area</div>} />
              <Route
                path="/admin-only"
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <div>Secret Admin Vault</div>
                  </RoleRoute>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it("renders loading indicator when auth is verifying token", () => {
    renderWithRouter("/protected-area", { isLoading: true });
    expect(screen.getByText(/validating security credentials/i)).toBeInTheDocument();
  });

  it("redirects unauthenticated user from protected route to /login", () => {
    renderWithRouter("/protected-area", { isAuthenticated: false, isLoading: false });
    expect(screen.getByText("Login Page Screen")).toBeInTheDocument();
    expect(screen.queryByText("Protected Operational Area")).not.toBeInTheDocument();
  });

  it("renders protected content when user is authenticated", () => {
    renderWithRouter("/protected-area", {
      isAuthenticated: true,
      isLoading: false,
      user: { role: "viewer" }
    });
    expect(screen.getByText("Protected Operational Area")).toBeInTheDocument();
  });

  it("denies access to non-admin user trying to access admin-only route with 403 screen", () => {
    renderWithRouter("/admin-only", {
      isAuthenticated: true,
      isLoading: false,
      user: { role: "viewer", name: "Bob Viewer" }
    });

    expect(screen.getByText(/403 — unauthorized role elevation/i)).toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret Admin Vault")).not.toBeInTheDocument();
  });

  it("permits admin user to access admin-only route", () => {
    renderWithRouter("/admin-only", {
      isAuthenticated: true,
      isLoading: false,
      user: { role: "admin", name: "Alice Admin" }
    });

    expect(screen.getByText("Secret Admin Vault")).toBeInTheDocument();
  });
});
