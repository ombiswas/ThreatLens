import React from "react";
import { FileText } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";

export function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
          Security Audit Trail (Admin)
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-soc-muted">
          Append-only immutable record of all authentication, incident status changes, and
          administrative actions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Audit Logs</CardTitle>
          <CardDescription>
            90-day retention logs capturing action, actor, timestamp, and IP address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="Audit Trail Log Viewer"
            description="Phase 10 will render paginated audit log feeds with event filtering and actor search."
          />
        </CardContent>
      </Card>
    </div>
  );
}
