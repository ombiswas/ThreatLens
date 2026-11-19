import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Lock,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { fetchUsers, updateUserRole, updateUserStatus } from "../../services/userApi.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { ROLES } from "../../utils/constants.js";

const ROLE_OPTIONS = [
  { value: ROLES.VIEWER, label: "Viewer", desc: "Read-only access to incidents and reports" },
  {
    value: ROLES.ANALYST,
    label: "Analyst",
    desc: "Can triage incidents, trigger replay, and run detection"
  },
  {
    value: ROLES.ADMIN,
    label: "Administrator",
    desc: "Full administrative control, user RBAC, audit logs"
  }
];

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal states for role change & status toggle
  const [targetUser, setTargetUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // 1. Fetch Users Query
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["users", page],
    queryFn: () => fetchUsers({ page, limit: pageSize }),
    keepPreviousData: true
  });

  const usersList = data?.users || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  // 2. Role Mutation
  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => updateUserRole(id, role),
    onSuccess: (updated) => {
      setIsRoleModalOpen(false);
      setTargetUser(null);
      addToast({
        title: "Role Updated",
        message: `User role has been updated to ${updated?.role || selectedRole}.`,
        type: "success"
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      addToast({
        title: "Update Failed",
        message: err.message || "Could not change user role.",
        type: "error"
      });
    }
  });

  // 3. Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => updateUserStatus(id, isActive),
    onSuccess: (updated) => {
      setIsStatusDialogOpen(false);
      setTargetUser(null);
      addToast({
        title: "Account Status Updated",
        message: `Account is now ${updated?.isActive ? "Active" : "Inactive"}.`,
        type: "success"
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      addToast({
        title: "Status Update Failed",
        message: err.message || "Could not modify account status.",
        type: "error"
      });
    }
  });

  const handleOpenRoleModal = (user) => {
    setTargetUser(user);
    setSelectedRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleOpenStatusDialog = (user) => {
    setTargetUser(user);
    setIsStatusDialogOpen(true);
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "critical";
      case "analyst":
        return "medium";
      default:
        return "neutral";
    }
  };

  const columns = [
    {
      key: "name",
      header: "Operator",
      render: (_, row) => {
        const isSelf = currentUser?._id === row?._id;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-soc-dark border border-soc-border text-xs font-bold text-stone-200 uppercase">
              {row?.name ? row.name[0] : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2 font-semibold text-stone-100">
                <span>{row?.name}</span>
                {isSelf && (
                  <span className="rounded bg-brand-primary/20 px-1.5 py-0.2 text-[10px] font-mono text-brand-primary border border-brand-primary/40">
                    You
                  </span>
                )}
              </div>
              <div className="font-mono text-xs text-soc-muted">{row?.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: "role",
      header: "Security Role",
      render: (role) => (
        <Badge variant={getRoleBadgeVariant(role)} size="sm" className="capitalize">
          {role}
        </Badge>
      )
    },
    {
      key: "isActive",
      header: "Status",
      render: (isActive) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
            isActive
              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
              : "bg-stone-900 text-stone-400 border border-stone-800"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-stone-500"}`}
          />
          {isActive ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      key: "createdAt",
      header: "Registered",
      render: (createdAt) => (
        <span className="text-xs text-soc-muted">
          {createdAt
            ? new Date(createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
              })
            : "-"}
        </span>
      )
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (_, row) => {
        const isSelf = currentUser?._id === row?._id;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isSelf}
              onClick={() => handleOpenRoleModal(row)}
              title={isSelf ? "Cannot change your own role" : "Modify operator role"}
            >
              Change Role
            </Button>

            <Button
              variant={row?.isActive ? "ghost" : "secondary"}
              size="sm"
              disabled={isSelf}
              onClick={() => handleOpenStatusDialog(row)}
              className={row?.isActive ? "text-rose-400 hover:bg-rose-950/30" : "text-emerald-400"}
              title={isSelf ? "Cannot deactivate yourself" : "Toggle active status"}
            >
              {row?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            User Accounts &amp; RBAC (Admin)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-soc-muted">
            Manage authenticated security accounts, assign privileges, and audit access credentials.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading || isRefetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh Accounts
        </Button>
      </div>

      {/* Security Policies Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 bg-soc-dark/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <Shield className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            Role Hierarchy
          </div>
          <div className="mt-2 text-xs text-stone-300 space-y-1">
            <div>
              <span className="font-bold text-stone-100">Admin:</span> Full RBAC, Audits &amp; Data
            </div>
            <div>
              <span className="font-bold text-stone-100">Analyst:</span> Flow Replay &amp; Triage
            </div>
            <div>
              <span className="font-bold text-stone-100">Viewer:</span> Read-Only SOC Monitoring
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-soc-dark/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <Lock className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Safety Constraints
          </div>
          <div className="mt-2 text-xs text-stone-300 space-y-1">
            <div>&bull; Self-demotion is strictly prohibited.</div>
            <div>&bull; Last active admin cannot be disabled.</div>
            <div>&bull; Passwords hashed with bcrypt (cost &ge; 12).</div>
          </div>
        </Card>

        <Card className="p-4 bg-soc-dark/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <Users className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            Active Operators
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-stone-100">
            {pagination.total}{" "}
            <span className="text-xs font-normal text-soc-muted">registered</span>
          </div>
          <div className="mt-1 text-[11px] text-soc-dim font-mono">
            JWT Stateless Session Management
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            System Accounts
          </CardTitle>
          <CardDescription>
            List of registered users with role assignments and access states.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            columns={columns}
            data={usersList}
            isLoading={isLoading}
            page={page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            emptyMessage="No user accounts registered."
          />
        </CardContent>
      </Card>

      {/* Change Role Modal */}
      {isRoleModalOpen && targetUser && (
        <Modal
          isOpen={isRoleModalOpen}
          onClose={() => {
            setIsRoleModalOpen(false);
            setTargetUser(null);
          }}
          title={`Update Role: ${targetUser.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-soc-muted">
              Select the new security role for{" "}
              <strong className="text-stone-200">{targetUser.email}</strong>. Role changes take
              effect on their next token refresh.
            </p>

            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedRole === opt.value
                      ? "border-brand-primary bg-brand-primary/10"
                      : "border-soc-border hover:bg-soc-raised/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="security-role"
                    value={opt.value}
                    checked={selectedRole === opt.value}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="mt-0.5 accent-brand-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold text-stone-100">{opt.label}</div>
                    <div className="text-[11px] text-soc-muted">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-soc-border/60">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setTargetUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={roleMutation.isPending}
                onClick={() =>
                  roleMutation.mutate({
                    id: targetUser._id,
                    role: selectedRole
                  })
                }
              >
                Save Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toggle Status Confirmation Dialog */}
      {isStatusDialogOpen && targetUser && (
        <ConfirmDialog
          isOpen={isStatusDialogOpen}
          onClose={() => {
            setIsStatusDialogOpen(false);
            setTargetUser(null);
          }}
          onConfirm={() =>
            statusMutation.mutate({
              id: targetUser._id,
              isActive: !targetUser.isActive
            })
          }
          title={targetUser.isActive ? "Deactivate User Account" : "Activate User Account"}
          description={
            targetUser.isActive
              ? `Are you sure you want to disable ${targetUser.name}'s account (${targetUser.email})? They will be barred from authenticating to the platform immediately.`
              : `Reactivate account for ${targetUser.name} (${targetUser.email})? They will regain access based on their assigned role.`
          }
          confirmText={targetUser.isActive ? "Deactivate Account" : "Activate Account"}
          cancelText="Cancel"
          isDanger={targetUser.isActive}
          isLoading={statusMutation.isPending}
        />
      )}
    </div>
  );
}
