import React from "react";
import { useAuth } from "../auth/useAuth.js";
import {
  ShieldAlert,
  Activity,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { RiskBadge, StatusBadge, AttackClassBadge, Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            Security Operations Center (SOC)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-soc-muted">
            Intelligent cyberattack detection, threat scoring, and baseline comparison console.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" aria-hidden="true" />
            <span>Active Operator: {user?.role?.toUpperCase()}</span>
          </span>
        </div>
      </div>

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card accent="terracotta" hover>
          <div className="flex items-center justify-between text-soc-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Classification Model
            </span>
            <Activity className="h-4 w-4 text-brand-primary" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-stone-100">RandomForest</div>
          <p className="mt-1 text-xs text-soc-muted">67 CIC-IDS2017 features normalized</p>
        </Card>

        <Card accent="amber" hover>
          <div className="flex items-center justify-between text-soc-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Threat Scoring</span>
            <ShieldAlert className="h-4 w-4 text-brand-accent" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-stone-100">0 – 100</div>
          <p className="mt-1 text-xs text-soc-muted">Transparent factor conservation</p>
        </Card>

        <Card accent="emerald" hover>
          <div className="flex items-center justify-between text-soc-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Baseline Rule Engine
            </span>
            <Layers className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-stone-100">Active Heuristics</div>
          <p className="mt-1 text-xs text-soc-muted">BruteForce, DoS/DDoS, PortScan</p>
        </Card>

        <Card accent="sky" hover>
          <div className="flex items-center justify-between text-soc-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Telemetry Stream</span>
            <Database className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-stone-100">Socket.IO</div>
          <p className="mt-1 text-xs text-soc-muted">Role-based real-time IP masking</p>
        </Card>
      </div>

      {/* Design System & Risk Severity Verification Section */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Severity Token System (Ember Studio + Dark SOC)</CardTitle>
          <CardDescription>
            Multi-modal accessibility: risk levels are distinguishable via explicit semantic icons,
            text labels, borders, and high-contrast color bands without relying on color perception
            alone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2 rounded-lg border border-soc-border bg-soc-dark/40 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-soc-muted">
                Critical (80–100)
              </span>
              <RiskBadge risk="Critical" />
              <p className="text-xs text-soc-muted leading-relaxed">
                Volumetric DoS/DDoS attacks and aggressive multi-target exploitation flows.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-soc-border bg-soc-dark/40 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-soc-muted">
                High (60–79)
              </span>
              <RiskBadge risk="High" />
              <p className="text-xs text-soc-muted leading-relaxed">
                Systematic reconnaissance scans and credential brute-forcing activity.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-soc-border bg-soc-dark/40 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-soc-muted">
                Medium (30–59)
              </span>
              <RiskBadge risk="Medium" />
              <p className="text-xs text-soc-muted leading-relaxed">
                Heuristic rule discrepancies and low-confidence classification anomalies.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-soc-border bg-soc-dark/40 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-soc-muted">
                Low (&lt; 30)
              </span>
              <RiskBadge risk="Low" />
              <p className="text-xs text-soc-muted leading-relaxed">
                Benign baseline traffic and transient non-threatening flow deviations.
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-soc-border/60 pt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-stone-300">Classification Badges:</span>
            <AttackClassBadge attackClass="Benign" />
            <AttackClassBadge attackClass="DoS/DDoS" />
            <AttackClassBadge attackClass="PortScan" />
            <AttackClassBadge attackClass="BruteForce" />

            <span className="ml-4 text-xs font-semibold text-stone-300">Triage Status:</span>
            <StatusBadge status="New" />
            <StatusBadge status="Under Review" />
            <StatusBadge status="Resolved" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
