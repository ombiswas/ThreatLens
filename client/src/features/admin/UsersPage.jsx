import React from "react";
import { Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";

export function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
          User Management &amp; RBAC (Admin)
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-soc-muted">
          Manage operator accounts, assign security roles (Admin, Analyst, Viewer), and update
          account status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Accounts</CardTitle>
          <CardDescription>
            Admin-only controls with safeguards preventing self-demotion or disabling the last
            active admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="User Management Console"
            description="Phase 10 will render paginated user tables, role dropdowns, status toggles, and audit confirmations."
          />
        </CardContent>
      </Card>
    </div>
  );
}
