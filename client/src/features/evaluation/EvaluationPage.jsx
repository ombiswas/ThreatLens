import React from "react";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";

export function EvaluationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
          Comparative Evaluation &amp; Benchmarking
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-soc-muted">
          Compare RandomForest machine learning classification against rule-based heuristic
          baselines on held-out test sets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Metrics &amp; Confusion Matrix</CardTitle>
          <CardDescription>
            Multi-class Precision, Recall, F1-Score, False Positive rate, and discrepancy
            drill-downs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Evaluation Analytics"
            description="Phase 10 will render interactive confusion matrices, Recharts metric comparisons, and heuristic rule analysis."
          />
        </CardContent>
      </Card>
    </div>
  );
}
