import React from "react";
import { ScanLine } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";

export function DetectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
          Single Flow Threat Detection
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-soc-muted">
          Manual flow inspection and classification against live ML inference and heuristic
          baselines.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Threat Detection Core</CardTitle>
          <CardDescription>
            Validates 67 CIC-IDS2017 features, invokes FastAPI microservice, computes threat score,
            and compares baseline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ScanLine}
            title="Flow Detection Playground"
            description="Phase 9 will provide interactive flow input fields, instant classification, and factor breakdown radar."
          />
        </CardContent>
      </Card>
    </div>
  );
}
