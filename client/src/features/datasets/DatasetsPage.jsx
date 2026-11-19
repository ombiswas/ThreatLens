import React from "react";
import { Database } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";

export function DatasetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
          Dataset Ingestion &amp; Traffic Replay
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-soc-muted">
          Upload CIC-IDS2017 network flow CSVs or initiate controlled replay sessions through the
          detection pipeline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dataset Library</CardTitle>
          <CardDescription>
            Multi-layered CSV validation, streaming parsing, and server-side replay state machine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Database}
            title="Dataset &amp; Replay Manager"
            description="Phase 10 will connect drag-and-drop CSV upload, progress trackers, and rate-bounded flow replay."
          />
        </CardContent>
      </Card>
    </div>
  );
}
