import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../context/ToastContext.jsx";
import { UsersPage } from "../features/admin/UsersPage.jsx";
import { AuditLogsPage } from "../features/admin/AuditLogsPage.jsx";
import * as userApi from "../services/userApi.js";
import * as auditApi from "../services/auditLogApi.js";
import * as authHook from "../features/auth/useAuth.js";

vi.mock("../services/userApi.js");
vi.mock("../services/auditLogApi.js");

const mockUsersData = {
  users: [
    {
      _id: "usr-admin-1",
      name: "Super Admin",
      email: "admin@cybershield.local",
      role: "admin",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    },
    {
      _id: "usr-analyst-2",
      name: "SOC Analyst Jane",
      email: "analyst@cybershield.local",
      role: "analyst",
      isActive: true,
      createdAt: "2026-01-05T00:00:00.000Z"
    }
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 10,
    pages: 1
  }
};

const mockAuditLogsData = {
  logs: [
    {
      _id: "log-1",
      action: "LOGIN_SUCCESS",
      userId: { _id: "usr-admin-1", name: "Super Admin", email: "admin@cybershield.local" },
      ip: "192.168.1.100",
      details: { role: "admin" },
      timestamp: "2026-03-15T08:30:00.000Z"
    },
    {
      _id: "log-2",
      action: "ROLE_CHANGE",
      userId: { _id: "usr-admin-1", name: "Super Admin", email: "admin@cybershield.local" },
      ip: "192.168.1.100",
      details: { target: "analyst@cybershield.local", newRole: "analyst" },
      timestamp: "2026-03-15T09:00:00.000Z"
    }
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 15,
    pages: 1
  }
};

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
}

describe("Admin Console Features (Phase 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { _id: "usr-admin-1", name: "Super Admin", role: "admin" },
      token: "mock-token",
      logout: vi.fn()
    });

    userApi.fetchUsers.mockResolvedValue(mockUsersData);
    auditApi.fetchAuditLogs.mockResolvedValue(mockAuditLogsData);
  });

  describe("UsersPage Component", () => {
    it("renders page header, safety constraints cards, and accounts table", async () => {
      renderWithClient(<UsersPage />);

      expect(
        screen.getByRole("heading", { name: /user accounts & rbac \(admin\)/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Role Hierarchy")).toBeInTheDocument();
      expect(screen.getByText("Safety Constraints")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
        expect(screen.getByText("SOC Analyst Jane")).toBeInTheDocument();
      });
    });

    it("prevents self-demotion or self-deactivation of current administrator", async () => {
      renderWithClient(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("You")).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button");
      // Find buttons for current user row
      const changeRoleButtons = buttons.filter((b) => b.textContent?.includes("Change Role"));
      const deactivateButtons = buttons.filter((b) => b.textContent?.includes("Deactivate"));

      // First row is the current logged-in user ('usr-admin-1')
      expect(changeRoleButtons[0]).toBeDisabled();
      expect(deactivateButtons[0]).toBeDisabled();

      // Second row is another user ('usr-analyst-2'), should be enabled
      expect(changeRoleButtons[1]).not.toBeDisabled();
      expect(deactivateButtons[1]).not.toBeDisabled();
    });

    it("opens role change modal and updates user role", async () => {
      userApi.updateUserRole.mockResolvedValue({
        user: { _id: "usr-analyst-2", role: "viewer" }
      });

      renderWithClient(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("SOC Analyst Jane")).toBeInTheDocument();
      });

      const changeRoleButtons = screen
        .getAllByRole("button")
        .filter((b) => b.textContent?.includes("Change Role"));

      fireEvent.click(changeRoleButtons[1]); // Click for Jane

      expect(screen.getByText(/Update Role: SOC Analyst Jane/i)).toBeInTheDocument();
      expect(screen.getByText("Save Role")).toBeInTheDocument();

      const saveBtn = screen.getByRole("button", { name: /save role/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(userApi.updateUserRole).toHaveBeenCalledWith("usr-analyst-2", "analyst");
      });
    });

    it("triggers refresh and displays confirmation toast when Refresh Accounts is clicked", async () => {
      renderWithClient(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
      });

      const refreshBtn = screen.getByRole("button", { name: /refresh accounts/i });
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByText("Accounts Refreshed")).toBeInTheDocument();
      });
    });
  });

  describe("AuditLogsPage Component", () => {
    it("renders audit trail header, filter controls, and logs table", async () => {
      renderWithClient(<AuditLogsPage />);

      expect(
        screen.getByRole("heading", { name: /security audit trail \(admin\)/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/action:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/to:/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText("LOGIN_SUCCESS").length).toBeGreaterThan(0);
        expect(screen.getAllByText("ROLE_CHANGE").length).toBeGreaterThan(0);
        expect(screen.getAllByText("192.168.1.100").length).toBe(2);
      });
    });

    it("triggers refetch with action filter when selecting an action", async () => {
      renderWithClient(<AuditLogsPage />);

      const actionSelect = screen.getByLabelText(/action:/i);
      fireEvent.change(actionSelect, { target: { value: "LOGIN_FAILURE" } });

      await waitFor(() => {
        expect(auditApi.fetchAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({ action: "LOGIN_FAILURE" })
        );
      });
    });
  });
});
