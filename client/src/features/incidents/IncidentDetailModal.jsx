import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { RiskBadge, StatusBadge, AttackClassBadge } from "../../components/ui/Badge.jsx";
import { Spinner } from "../../components/ui/Spinner.jsx";
import { useAuth } from "../auth/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import {
  fetchIncidentById,
  updateIncidentStatus,
  addIncidentNote
} from "../../services/incidentApi.js";
import {
  ShieldAlert,
  Clock,
  Layers,
  MessageSquare,
  ArrowRight,
  Send,
  AlertCircle
} from "lucide-react";

const VALID_TRANSITIONS = {
  New: ["Under Review", "Resolved"],
  "Under Review": ["Resolved", "New"],
  Resolved: ["Under Review"]
};

export function IncidentDetailModal({ incidentId, isOpen, onClose }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const userRole = (user?.role || "viewer").toLowerCase();
  const canEdit = userRole === "admin" || userRole === "analyst";

  // Fetch full incident detail
  const {
    data: incident,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => fetchIncidentById(incidentId),
    enabled: Boolean(isOpen && incidentId)
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus) => updateIncidentStatus(incidentId, newStatus),
    onSuccess: (updated) => {
      queryClient.setQueryData(["incident", incidentId], updated);
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      addToast({
        type: "success",
        title: "Status Updated",
        message: `Incident triage transitioned to "${updated.status}".`
      });
    },
    onError: (err) => {
      addToast({
        type: "error",
        title: "Status Update Failed",
        message: err.message || "Failed to update incident status."
      });
    }
  });

  // Note mutation
  const noteMutation = useMutation({
    mutationFn: (text) => addIncidentNote(incidentId, text),
    onSuccess: (updated) => {
      queryClient.setQueryData(["incident", incidentId], updated);
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setNoteText("");
      addToast({
        type: "success",
        title: "Note Recorded",
        message: "Analytical investigation note appended."
      });
    },
    onError: (err) => {
      addToast({
        type: "error",
        title: "Note Failed",
        message: err.message || "Unable to save investigation note."
      });
    }
  });

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    noteMutation.mutate(noteText.trim());
  };

  const currentStatus = incident?.status || "New";
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={incident ? `Incident #${incident._id?.slice(-8).toUpperCase()}` : "Incident Detail"}
      description="In-depth forensic flow evaluation, threat scoring breakdown, and analyst triage"
      maxWidth="max-w-2xl"
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-soc-muted">
          <Spinner size="lg" className="border-t-brand-primary" />
          <span className="mt-3 text-xs font-mono uppercase tracking-wider">
            Loading Incident Dossier...
          </span>
        </div>
      ) : isError || !incident ? (
        <div className="flex flex-col items-center justify-center py-10 text-rose-400">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm font-semibold">Failed to load incident details</p>
          <p className="text-xs text-soc-muted mt-1">{error?.message || "Record not found."}</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* 1. Header Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-soc-border bg-soc-dark/50 p-3.5 text-xs">
            <div>
              <span className="text-soc-muted uppercase tracking-wider text-[10px] font-semibold block">
                Detection Time
              </span>
              <span className="font-mono text-stone-200 mt-0.5 block">
                {incident.detectedAt ? new Date(incident.detectedAt).toLocaleString() : "-"}
              </span>
            </div>

            <div>
              <span className="text-soc-muted uppercase tracking-wider text-[10px] font-semibold block">
                Source Address
              </span>
              <span className="font-mono font-semibold text-stone-100 mt-0.5 block truncate">
                {incident.source || "Unknown"}
              </span>
            </div>

            <div>
              <span className="text-soc-muted uppercase tracking-wider text-[10px] font-semibold block">
                Target Destination
              </span>
              <span className="font-mono font-semibold text-stone-100 mt-0.5 block truncate">
                {incident.destination || "Unknown"}
              </span>
            </div>

            <div>
              <span className="text-soc-muted uppercase tracking-wider text-[10px] font-semibold block">
                Protocol
              </span>
              <span className="font-mono text-stone-200 mt-0.5 block">
                {incident.protocol || "TCP"}
              </span>
            </div>
          </div>

          {/* 2. Explainable Threat Score Section */}
          <div className="rounded-xl border border-soc-border bg-soc-surface p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-soc-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                <h4 className="text-sm font-semibold text-stone-100">
                  Explainable Threat Score Breakdown
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-extrabold text-stone-100">
                  {incident.score} <span className="text-xs text-soc-muted">/ 100</span>
                </span>
                <RiskBadge risk={incident.riskLevel} />
              </div>
            </div>

            {/* Score Factors */}
            <div className="mt-3.5 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-soc-muted uppercase tracking-wider">
                Contributing Factor Components
              </div>

              {(incident.explanation || []).map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border border-soc-border/40 bg-soc-dark/40 px-3 py-2"
                >
                  <div>
                    <span className="font-semibold text-stone-200">{exp.factor}</span>
                    {exp.description && (
                      <p className="text-[11px] text-soc-muted mt-0.5">{exp.description}</p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-brand-accent">
                    +{exp.contribution} pts
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t border-soc-border/60 text-[11px] text-soc-dim">
                <span>Conservation Invariant: Factors strictly sum to final score</span>
                <span className="font-mono font-semibold text-stone-300">
                  Total: {incident.score}
                </span>
              </div>
            </div>
          </div>

          {/* 3. ML vs Baseline Rule Engine Comparison */}
          <div className="rounded-xl border border-soc-border bg-soc-surface p-4">
            <div className="flex items-center gap-2 border-b border-soc-border/60 pb-2.5">
              <Layers className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-stone-100">
                Machine Learning vs Heuristic Baseline
              </h4>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* ML Prediction */}
              <div className="rounded border border-soc-border/50 bg-soc-dark/40 p-3">
                <span className="text-soc-muted text-[10px] uppercase tracking-wider font-semibold block">
                  RandomForest Classifier
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <AttackClassBadge attackClass={incident.mlClass} />
                  <span className="font-mono font-bold text-stone-200">
                    {Math.round((incident.confidence || 0) * 1000) / 10}% conf
                  </span>
                </div>
              </div>

              {/* Heuristic Baseline */}
              <div className="rounded border border-soc-border/50 bg-soc-dark/40 p-3">
                <span className="text-soc-muted text-[10px] uppercase tracking-wider font-semibold block">
                  Rule-Based Baseline Heuristic
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <AttackClassBadge attackClass={incident.baselineClass} />
                  <span className="text-xs text-soc-muted">
                    {incident.mlClass === incident.baselineClass ? (
                      <span className="text-emerald-400 font-medium">✓ Concordant</span>
                    ) : (
                      <span className="text-amber-400 font-medium">⚠ Heuristic Divergence</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Triage Status Transition Control */}
          <div className="rounded-xl border border-soc-border bg-soc-surface p-4">
            <div className="flex items-center justify-between border-b border-soc-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-400" aria-hidden="true" />
                <h4 className="text-sm font-semibold text-stone-100">Incident Triage Lifecycle</h4>
              </div>
              <StatusBadge status={currentStatus} />
            </div>

            <div className="mt-3">
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-soc-muted">Transition to:</span>
                  {allowedTransitions.length === 0 ? (
                    <span className="text-xs text-soc-dim">No further transitions permitted</span>
                  ) : (
                    allowedTransitions.map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        variant="secondary"
                        size="sm"
                        isLoading={statusMutation.isPending}
                        onClick={() => statusMutation.mutate(nextStatus)}
                        iconRight={<ArrowRight className="h-3 w-3" aria-hidden="true" />}
                      >
                        {nextStatus}
                      </Button>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-xs text-soc-dim">
                  Status transition controls are restricted to Analyst and Administrator roles.
                </p>
              )}
            </div>
          </div>

          {/* 5. Analyst Investigation Notes Thread */}
          <div className="rounded-xl border border-soc-border bg-soc-surface p-4">
            <div className="flex items-center gap-2 border-b border-soc-border/60 pb-2.5">
              <MessageSquare className="h-4 w-4 text-stone-400" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-stone-100">
                Investigation Notes ({(incident.notes || []).length})
              </h4>
            </div>

            {/* Existing Notes */}
            <div className="mt-3 space-y-2.5">
              {(incident.notes || []).length === 0 ? (
                <p className="py-2 text-xs text-soc-dim italic">No analyst notes recorded yet.</p>
              ) : (
                incident.notes.map((n) => (
                  <div
                    key={n._id}
                    className="rounded border border-soc-border/50 bg-soc-dark/40 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-soc-muted border-b border-soc-border/40 pb-1 mb-1.5">
                      <span className="font-semibold text-stone-200">{n.authorName}</span>
                      <span className="font-mono">
                        {n.timestamp ? new Date(n.timestamp).toLocaleString() : ""}
                      </span>
                    </div>
                    {/* Safe plain text rendering only */}
                    <p className="text-stone-300 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            {canEdit ? (
              <form onSubmit={handleAddNote} className="mt-4 pt-3 border-t border-soc-border/60">
                <div className="relative">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter analytical forensic observations (max 1000 chars)..."
                    className="w-full rounded-md border border-soc-border bg-soc-dark/60 p-2.5 text-xs text-stone-100 placeholder-soc-dim focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                  />
                  <div className="text-right text-[10px] text-soc-dim mt-1">
                    {noteText.length} / 1000 characters
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!noteText.trim() || noteMutation.isPending}
                    isLoading={noteMutation.isPending}
                    iconLeft={<Send className="h-3 w-3" aria-hidden="true" />}
                  >
                    Post Note
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}
