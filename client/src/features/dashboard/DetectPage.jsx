import React, { useState, useCallback, useMemo, useContext } from "react";
import {
  ScanLine,
  Shield,
  ShieldAlert,
  Play,
  RotateCcw,
  Code2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Flame,
  Layers,
  Activity,
  Info,
  Scale
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge, RiskBadge, AttackClassBadge } from "../../components/ui/Badge.jsx";
import { Spinner } from "../../components/ui/Spinner.jsx";
import { ToastContext } from "../../context/toastContextDef.js";
import { detectSingleFlow } from "../../services/detectApi.js";
import {
  FLOW_PRESETS,
  KEY_FLOW_FIELDS,
  getDefaultFlowRecord
} from "./detectPresets.js";
import { FEATURE_NAMES } from "../../utils/constants.js";

export function DetectPage() {
  const toastCtx = useContext(ToastContext);
  const addToast = toastCtx?.addToast || (() => {});

  // State: active flow record (all 67 features)
  const [activePresetId, setActivePresetId] = useState("benign");
  const [flowRecord, setFlowRecord] = useState(getDefaultFlowRecord);

  // Inspector mode: "keys" (friendly form) vs "json" (raw 67 features)
  const [inspectorMode, setInspectorMode] = useState("keys");
  const [rawJsonText, setRawJsonText] = useState(() =>
    JSON.stringify(getDefaultFlowRecord(), null, 2)
  );
  const [jsonError, setJsonError] = useState(null);

  // Execution state
  const [isLoading, setIsLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [executionError, setExecutionError] = useState(null);

  // 1. Handle preset selection
  const handleSelectPreset = useCallback(
    (preset) => {
      setActivePresetId(preset.id);
      const cloned = { ...preset.flow };
      setFlowRecord(cloned);
      setRawJsonText(JSON.stringify(cloned, null, 2));
      setJsonError(null);
      setExecutionError(null);
      addToast({
        title: `Loaded Preset: ${preset.label}`,
        description: preset.description,
        type: "info"
      });
    },
    [addToast]
  );

  // 2. Handle key field edits
  const handleKeyFieldChange = useCallback((key, value) => {
    const numValue = value === "" ? 0 : Number(value);
    setActivePresetId("custom");
    setFlowRecord((prev) => {
      const updated = { ...prev, [key]: numValue };
      setRawJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  }, []);

  // 3. Handle raw JSON edits
  const handleJsonChange = useCallback((text) => {
    setRawJsonText(text);
    setActivePresetId("custom");
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) {
        setJsonError("JSON must be an object containing the flow features.");
        return;
      }
      // Check feature presence
      const missing = FEATURE_NAMES.filter((f) => parsed[f] === undefined);
      if (missing.length > 0) {
        setJsonError(`Missing ${missing.length} features (e.g. "${missing[0]}")`);
        return;
      }
      setJsonError(null);
      setFlowRecord(parsed);
    } catch (err) {
      setJsonError(`Syntax error: ${err.message}`);
    }
  }, []);

  // 4. Reset to default
  const handleReset = useCallback(() => {
    const defaultFlow = getDefaultFlowRecord();
    setActivePresetId("benign");
    setFlowRecord(defaultFlow);
    setRawJsonText(JSON.stringify(defaultFlow, null, 2));
    setJsonError(null);
    setDetectionResult(null);
    setExecutionError(null);
    addToast({
      title: "Reset Flow Parameters",
      description: "Restored baseline benign HTTPS traffic vector.",
      type: "info"
    });
  }, [addToast]);

  // 5. Submit flow for detection
  const handleRunDetection = useCallback(async () => {
    if (jsonError) {
      addToast({
        title: "Validation Error",
        description: "Please fix JSON syntax and missing features before analyzing.",
        type: "error"
      });
      return;
    }

    setIsLoading(true);
    setExecutionError(null);

    try {
      const result = await detectSingleFlow(flowRecord);
      setDetectionResult(result);
      addToast({
        title: "Threat Analysis Complete",
        description: `Classified as ${result.mlClass} (Score: ${result.score}/100)`,
        type: result.score >= 50 ? "warning" : "success"
      });
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to communicate with detection core.";
      setExecutionError(errorMsg);
      addToast({
        title: "Detection Failed",
        description: errorMsg,
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  }, [flowRecord, jsonError, addToast]);

  // Derived metrics for results panel
  const scoreColor = useMemo(() => {
    if (!detectionResult) return "text-stone-300";
    const score = detectionResult.score || 0;
    if (score >= 75) return "text-rose-400";
    if (score >= 50) return "text-orange-400";
    if (score >= 25) return "text-amber-400";
    return "text-emerald-400";
  }, [detectionResult]);

  const scoreBarWidth = useMemo(() => {
    if (!detectionResult) return "0%";
    return `${Math.min(Math.max(detectionResult.score || 0, 0), 100)}%`;
  }, [detectionResult]);

  const scoreBarBg = useMemo(() => {
    if (!detectionResult) return "bg-emerald-500";
    const score = detectionResult.score || 0;
    if (score >= 75) return "bg-rose-500";
    if (score >= 50) return "bg-orange-500";
    if (score >= 25) return "bg-amber-500";
    return "bg-emerald-500";
  }, [detectionResult]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
              Single Flow Threat Detection
            </h1>
            <Badge variant="primary" className="hidden sm:inline-flex">
              Interactive Console
            </Badge>
          </div>
          <p className="mt-1 text-xs text-soc-muted sm:text-sm">
            Manual inspection and ad-hoc classification against live Random Forest ML inference and
            deterministic heuristic baselines.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[11px] font-mono">
            Model: Random Forest (67 features)
          </Badge>
          <Badge variant="outline" className="text-[11px] font-mono hidden lg:inline-flex">
            RBAC: Analyst & Admin
          </Badge>
        </div>
      </div>

      {/* Preset Vectors Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-soc-muted flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />
            Quick-Load Attack Vector Presets (CIC-IDS2017 Samples)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs text-soc-muted hover:text-stone-200"
            iconLeft={<RotateCcw className="h-3 w-3" />}
          >
            Reset Vector
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "border-brand-primary bg-brand-primary/10 shadow-sm ring-1 ring-brand-primary/40"
                    : "border-soc-border bg-soc-raised/40 hover:border-soc-border-hover hover:bg-soc-raised/80"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="font-mono text-xs font-semibold text-stone-200">
                    {preset.label}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      preset.category === "Benign"
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                        : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-soc-muted">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Flow Feature Inspector (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-soc-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-brand-accent" aria-hidden="true" />
                    Flow Record Inspector
                  </CardTitle>
                  <CardDescription>
                    Configure statistical network flow metrics to analyze.
                  </CardDescription>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex items-center rounded-lg border border-soc-border bg-soc-dark/70 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setInspectorMode("keys")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                      inspectorMode === "keys"
                        ? "bg-brand-primary text-stone-900 font-semibold"
                        : "text-soc-muted hover:text-stone-200"
                    }`}
                  >
                    <Sliders className="h-3 w-3" />
                    Key Parameters
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorMode("json")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                      inspectorMode === "json"
                        ? "bg-brand-primary text-stone-900 font-semibold"
                        : "text-soc-muted hover:text-stone-200"
                    }`}
                  >
                    <Code2 className="h-3 w-3" />
                    All 67 Features (JSON)
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {inspectorMode === "keys" ? (
                /* Key Parameters Grid */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {KEY_FLOW_FIELDS.map((field) => {
                      const val = flowRecord[field.key] ?? 0;
                      return (
                        <div key={field.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor={`field-${field.key}`}
                              className="text-xs font-medium text-stone-300 truncate"
                              title={field.label}
                            >
                              {field.label}
                            </label>
                            <span className="text-[10px] text-soc-muted truncate max-w-[120px]">
                              {field.key}
                            </span>
                          </div>
                          <input
                            id={`field-${field.key}`}
                            type={field.type}
                            step={field.step}
                            min={field.min}
                            max={field.max}
                            value={val}
                            onChange={(e) => handleKeyFieldChange(field.key, e.target.value)}
                            className="w-full rounded-md border border-soc-border bg-soc-dark px-3 py-1.5 font-mono text-xs text-stone-100 placeholder:text-stone-600 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                          <p className="text-[10px] text-soc-muted">{field.help}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-md border border-soc-border bg-soc-dark/30 p-2.5 text-xs text-soc-muted flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 text-brand-accent mt-0.5" />
                    <span>
                      Modifying key parameters updates the active flow vector in real time. The
                      remaining 55 underlying statistical features (inter-arrival variances, header
                      ratios) remain preserved from the loaded preset. Switch to{" "}
                      <strong>All 67 Features</strong> to inspect or edit every feature.
                    </span>
                  </div>
                </div>
              ) : (
                /* Raw JSON Editor */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-soc-muted">
                    <span>Raw Flow Dictionary (Strict 67 features):</span>
                    {jsonError ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Invalid schema
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        67 features valid
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={16}
                    value={rawJsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    className="w-full font-mono text-xs rounded-md border border-soc-border bg-soc-dark p-3 text-stone-200 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    placeholder="Paste or edit flow JSON with 67 features..."
                    spellCheck={false}
                  />
                  {jsonError && (
                    <div className="rounded border border-rose-800/50 bg-rose-950/40 p-2 text-xs text-rose-300">
                      {jsonError}
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t border-soc-border flex items-center justify-between pt-3">
              <span className="text-xs text-soc-muted">
                Status:{" "}
                <span className="font-semibold text-stone-200">
                  {activePresetId === "custom"
                    ? "Custom Vector Edited"
                    : `Preset: ${FLOW_PRESETS.find((p) => p.id === activePresetId)?.label || "Loaded"}`}
                </span>
              </span>

              <Button
                variant="primary"
                onClick={handleRunDetection}
                disabled={isLoading || Boolean(jsonError)}
                isLoading={isLoading}
                iconLeft={!isLoading && <ScanLine className="h-4 w-4" />}
                className="px-5 shadow-sm"
              >
                Run Threat Detection
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Live Threat Analysis Results (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-soc-border">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand-accent" aria-hidden="true" />
                  Live Detection Results
                </CardTitle>
                {detectionResult && (
                  <span className="text-[11px] font-mono text-soc-muted">
                    Response: 200 OK
                  </span>
                )}
              </div>
              <CardDescription>
                FastAPI Random Forest ML inference and baseline heuristic evaluation.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-center">
              {isLoading ? (
                /* Loading State */
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Spinner size="lg" className="text-brand-accent" />
                  <p className="font-mono text-xs font-semibold text-stone-200">
                    Executing ML Inference Pipeline...
                  </p>
                  <p className="text-xs text-soc-muted max-w-xs">
                    Transmitting 67 features to FastAPI, evaluating heuristic baseline rules, and
                    computing explainable threat factors.
                  </p>
                </div>
              ) : executionError ? (
                /* Error State */
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 rounded-lg border border-rose-800/40 bg-rose-950/20 p-4">
                  <AlertCircle className="h-8 w-8 text-rose-400" />
                  <h3 className="text-sm font-semibold text-rose-300">Analysis Error</h3>
                  <p className="text-xs text-soc-muted max-w-xs">{executionError}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRunDetection}
                    className="mt-2 text-xs"
                  >
                    Retry Analysis
                  </Button>
                </div>
              ) : detectionResult ? (
                /* Results Display */
                <div className="space-y-4">
                  {/* Top Header Classification Banner */}
                  <div className="rounded-lg border border-soc-border bg-soc-dark/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-soc-muted">
                          ML Predicted Classification
                        </span>
                        <div className="flex items-center gap-2 pt-0.5">
                          <AttackClassBadge attackClass={detectionResult.mlClass} />
                          <RiskBadge risk={detectionResult.riskLevel} />
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-soc-muted">
                          Confidence
                        </span>
                        <p className="font-mono text-sm font-bold text-stone-100">
                          {(detectionResult.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Threat Score Gauge */}
                    <div className="space-y-1.5 pt-2 border-t border-soc-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-brand-accent" />
                          Threat Score
                        </span>
                        <span className={`font-mono text-lg font-extrabold ${scoreColor}`}>
                          {detectionResult.score}{" "}
                          <span className="text-xs font-normal text-soc-muted">/ 100</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-soc-raised">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${scoreBarBg}`}
                          style={{ width: scoreBarWidth }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ML vs Baseline Rule Comparison Box */}
                  <div className="rounded-lg border border-soc-border bg-soc-raised/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-200">
                      <span className="flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-brand-accent" />
                        ML vs. Baseline Comparison
                      </span>
                      {detectionResult.mlClass === detectionResult.baselineClass ? (
                        <Badge variant="success" className="text-[10px] py-0 px-2">
                          Consensus Match
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px] py-0 px-2">
                          Discrepancy
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="rounded border border-soc-border/60 bg-soc-dark/40 p-2">
                        <span className="text-[10px] text-soc-muted uppercase block">
                          ML Model
                        </span>
                        <span className="font-mono font-semibold text-stone-200">
                          {detectionResult.mlClass}
                        </span>
                      </div>

                      <div className="rounded border border-soc-border/60 bg-soc-dark/40 p-2">
                        <span className="text-[10px] text-soc-muted uppercase block">
                          Rule Baseline
                        </span>
                        <span className="font-mono font-semibold text-stone-200">
                          {detectionResult.baselineClass}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-soc-muted font-mono pt-1">
                      Rule Evaluated:{" "}
                      <span className="text-stone-300">
                        {detectionResult.baselineRule || "NONE (BENIGN)"}
                      </span>
                    </div>
                  </div>

                  {/* Class Probability Distribution */}
                  {detectionResult.probabilities && (
                    <div className="rounded-lg border border-soc-border bg-soc-raised/20 p-3 space-y-2">
                      <span className="text-xs font-semibold text-stone-200 block">
                        Class Probabilities (Softmax Distribution)
                      </span>
                      <div className="space-y-1.5">
                        {Object.entries(detectionResult.probabilities).map(([cls, prob]) => {
                          const pct = (Number(prob) * 100).toFixed(1);
                          return (
                            <div key={cls} className="space-y-0.5 text-xs">
                              <div className="flex items-center justify-between font-mono text-[11px]">
                                <span className="text-stone-300">{cls}</span>
                                <span className="text-soc-muted font-semibold">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-soc-raised overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    cls === detectionResult.mlClass
                                      ? "bg-brand-accent"
                                      : "bg-stone-600"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Transparent Explanation Factors */}
                  {detectionResult.explanation && detectionResult.explanation.length > 0 && (
                    <div className="rounded-lg border border-soc-border bg-soc-raised/20 p-3 space-y-2">
                      <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-brand-accent" />
                        Threat Factor Contributions
                      </span>
                      <div className="space-y-1.5">
                        {detectionResult.explanation.map((factor, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-2 text-xs rounded border border-soc-border/40 bg-soc-dark/30 p-2"
                          >
                            <div>
                              <p className="font-semibold text-stone-200">{factor.factor}</p>
                              <p className="text-[11px] text-soc-muted">{factor.description}</p>
                            </div>
                            <span className="font-mono text-xs font-bold text-brand-accent shrink-0">
                              +{factor.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Ready State */
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-full border border-dashed border-soc-border flex items-center justify-center bg-soc-raised/40">
                    <ScanLine className="h-6 w-6 text-brand-accent" />
                  </div>
                  <h3 className="text-sm font-semibold text-stone-200">Ready for Analysis</h3>
                  <p className="text-xs text-soc-muted max-w-xs">
                    Choose one of the 4 attack presets above or modify flow parameters on the left,
                    then click <strong>Run Threat Detection</strong> to perform live classification.
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t border-soc-border py-2.5 text-[11px] text-soc-muted flex items-center justify-between">
              <span>Simulation Mode (Safe)</span>
              <span>No live traffic blocked</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
