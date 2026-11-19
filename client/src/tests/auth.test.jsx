import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { RegisterPage } from "../features/auth/RegisterPage.jsx";
import { AuthContext } from "../features/auth/authContextDef.js";

describe("Auth Feature Pages", () => {
  let mockLogin;
  let mockRegister;

  beforeEach(() => {
    mockLogin = vi.fn();
    mockRegister = vi.fn();
  });

  const renderWithAuth = (ui, authOverrides = {}) => {
    const authValue = {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: mockRegister,
      logout: vi.fn(),
      ...authOverrides
    };

    return render(
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    );
  };

  describe("LoginPage", () => {
    it("renders login form and default elements", () => {
      renderWithAuth(<LoginPage />);

      expect(screen.getByRole("heading", { name: /sign in to console/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    });

    it("displays validation error on invalid email address", async () => {
      renderWithAuth(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });

      const submitButton = screen.getByRole("button", { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("submits valid credentials to auth service", async () => {
      mockLogin.mockResolvedValueOnce({ success: true });
      renderWithAuth(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "admin@cybershield.local" }
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "AdminP@ssw0rdSecure!2026" }
      });

      fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: "admin@cybershield.local",
          password: "AdminP@ssw0rdSecure!2026"
        });
      });
    });

    it("displays server error alert when authentication fails", async () => {
      mockLogin.mockRejectedValueOnce({
        message: "Invalid credentials. Please verify and try again."
      });
      renderWithAuth(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "analyst@test.local" }
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "WrongPassword123!" }
      });

      fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/invalid credentials/i);
      });
    });
  });

  describe("RegisterPage", () => {
    it("renders registration form and viewer account disclaimer", () => {
      renderWithAuth(<RegisterPage />);

      expect(screen.getByRole("heading", { name: /register account/i })).toBeInTheDocument();
      expect(screen.getByText(/self-registration provisions a/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it("enforces password policy checklist", async () => {
      renderWithAuth(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      fireEvent.change(passwordInput, { target: { value: "weak" } });

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 10 characters/i)).toBeInTheDocument();
      });
    });
  });
});
