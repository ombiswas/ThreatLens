import React from "react";
import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";

export function IncidentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
          Incident Triage &amp; Forensics
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-soc-muted">
          Review, filter, and triage detected network attack incidents with transparent scoring
          breakdowns.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Incident Repository</CardTitle>
          <CardDescription>
            Incidents will populate here in real-time via Socket.IO feeds or historical dataset
            uploads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ShieldAlert}
            title="Incident Console Ready"
            description="Phase 9 will connect live incident tables, sorting, role-based IP masking, status updates, and CSV export."
          />
        </CardContent>
      </Card>
    </div>
  );
}
