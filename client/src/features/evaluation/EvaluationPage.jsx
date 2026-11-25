import React, { useState, useCallback, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ToastContext } from "../../context/toastContextDef.js";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import {
  BarChart3,
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Scale,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { fetchDatasets } from "../../services/datasetApi.js";
import { fetchLatestModelInfo, fetchDatasetEvaluation } from "../../services/evaluationApi.js";
import { IncidentDetailModal } from "../incidents/IncidentDetailModal.jsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Spinner } from "../../components/ui/Spinner.jsx";

const EVALUATION_CLASSES = ["Benign", "DoS/DDoS", "PortScan", "BruteForce"];

export function EvaluationPage() {
  const queryClient = useQueryClient();
  const toastCtx = useContext(ToastContext);
  const addToast = toastCtx?.addToast || (() => {});
  const [selectedDatasetId, setSelectedDatasetId] = useState("demo");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  // 1. Fetch available datasets for the dropdown
  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: fetchDatasets
  });

  // 2. Fetch model architecture metadata & offline metrics
  const { data: modelMetadata } = useQuery({
    queryKey: ["model-metadata"],
    queryFn: fetchLatestModelInfo,
    staleTime: 60000
  });

  // 3. Fetch comparative live evaluation for selected dataset
  const {
    data: evalData,
    isLoading: isEvalLoading,
    isRefetching: isEvalRefetching,
    isFetching: isEvalFetching,
    refetch: refetchEval
  } = useQuery({
    queryKey: ["evaluation", selectedDatasetId],
    queryFn: () => fetchDatasetEvaluation(selectedDatasetId),
    staleTime: 30000
  });

  const mlMetrics = evalData?.mlModel || evalData?.data?.mlModel || {};
  const baselineMetrics = evalData?.baseline || evalData?.data?.baseline || {};
  const confusionMatrix = mlMetrics?.confusionMatrix || {};

  const handleRecalculate = useCallback(async () => {
    try {
      await Promise.all([
        refetchEval(),
        queryClient.invalidateQueries({ queryKey: ["evaluation", selectedDatasetId] })
      ]);
      addToast({
        title: "Evaluation Recalculated",
        message: "Comparative metrics and confusion matrix updated successfully.",
        type: "success"
      });
    } catch (err) {
      addToast({
        title: "Recalculation Failed",
        message: err.message || "Failed to recalculate evaluation metrics.",
        type: "error"
      });
    }
  }, [refetchEval, queryClient, selectedDatasetId, addToast]);

  // Format Recharts data for per-class comparisons
  const classComparisonData = EVALUATION_CLASSES.map((cls) => {
    const mlPerClass = mlMetrics.perClass?.[cls] || {};
    const basePerClass = baselineMetrics.perClass?.[cls] || {};

    return {
      name: cls,
      "ML F1": mlPerClass.f1Score !== undefined ? Math.round(mlPerClass.f1Score * 100) : 0,
      "Baseline F1":
        basePerClass.f1Score !== undefined ? Math.round(basePerClass.f1Score * 100) : 0,
      "ML Precision":
        mlPerClass.precision !== undefined ? Math.round(mlPerClass.precision * 100) : 0,
      "Baseline Precision":
        basePerClass.precision !== undefined ? Math.round(basePerClass.precision * 100) : 0
    };
  });

  const overallMetrics = [
    {
      metric: "Overall Accuracy",
      ml: mlMetrics.accuracy,
      baseline: baselineMetrics.accuracy,
      description: "Fraction of flows classified correctly across all classes"
    },
    {
      metric: "Macro F1-Score",
      ml: mlMetrics.macroF1,
      baseline: baselineMetrics.macroF1,
      description: "Unweighted mean F1-Score across all attack and benign classes"
    },
    {
      metric: "Macro Precision",
      ml: mlMetrics.macroPrecision,
      baseline: baselineMetrics.macroPrecision,
      description: "Average purity of positive predictions across all classes"
    },
    {
      metric: "Macro Recall",
      ml: mlMetrics.macroRecall,
      baseline: baselineMetrics.macroRecall,
      description: "Average detection coverage of actual ground truth attack instances"
    },
    {
      metric: "Weighted F1-Score",
      ml: mlMetrics.weightedF1,
      baseline: baselineMetrics.weightedF1,
      description: "Support-weighted F1 harmonic mean"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            Comparative Evaluation &amp; Benchmarking
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-soc-muted">
            Benchmark Random Forest ML classification against rule-based heuristic baselines across
            held-out flow captures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="eval-dataset-select"
              className="text-xs font-semibold uppercase tracking-wider text-soc-muted whitespace-nowrap"
            >
              Dataset:
            </label>
            <select
              id="eval-dataset-select"
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="rounded-lg border border-soc-border bg-soc-dark px-3 py-1.5 text-xs font-medium text-stone-100 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="demo">CIC-IDS2017 Demo Sample</option>
              {datasets.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({(d.rowCount || 0).toLocaleString()} flows)
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecalculate}
            disabled={isEvalLoading || isEvalFetching}
            isLoading={isEvalFetching}
            iconLeft={
              <RefreshCw
                className={`h-4 w-4 ${isEvalFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            }
          >
            Recalculate
          </Button>
        </div>
      </div>

      {/* Model & Baseline Architecture Specs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-soc-dark/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <Cpu className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            ML Champion Model
          </div>
          <div className="mt-2 font-display text-lg font-bold text-stone-100">
            {modelMetadata?.mlModel?.name || "Random Forest Classifier"}
          </div>
          <div className="mt-1 text-[11px] text-soc-muted">
            {modelMetadata?.mlModel?.version ? `v${modelMetadata.mlModel.version} • ` : ""}100 Trees
            &bull; Max Depth 20 &bull; Class-Balanced
          </div>
        </Card>

        <Card className="p-4 bg-soc-dark/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <Layers className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Feature Engineering
          </div>
          <div className="mt-2 font-display text-lg font-bold text-stone-100">
            67 Statistical Features
          </div>
          <div className="mt-1 text-[11px] text-soc-muted">
            StandardScaler &bull; Inter-Arrival &amp; Flow IAT
          </div>
        </Card>

        <Card className="p-4 bg-soc-dark/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <Scale className="h-4 w-4 text-amber-400" aria-hidden="true" />
            Heuristic Baseline
          </div>
          <div className="mt-2 font-display text-lg font-bold text-stone-100">
            Calibrated Rule Engine
          </div>
          <div className="mt-1 text-[11px] text-soc-muted">
            SYN Floods &bull; Rapid Port Scans &bull; Auth Bursts
          </div>
        </Card>

        <Card className="p-4 bg-soc-dark/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-soc-muted">
            <ShieldCheck className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            Evaluation Scope
          </div>
          <div className="mt-2 font-display text-lg font-bold text-stone-100">
            {(evalData?.totalEvaluated ?? evalData?.data?.totalEvaluated)
              ? `${(evalData.totalEvaluated ?? evalData.data.totalEvaluated).toLocaleString()} flows`
              : "Demo Benchmark"}
          </div>
          <div className="mt-1 text-[11px] text-soc-muted">
            4 Classes: Benign, DoS, PortScan, BruteForce
          </div>
        </Card>
      </div>

      {isEvalLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-soc-border bg-soc-surface">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="text-xs font-mono text-soc-muted">
              Running comparative evaluation across flow records...
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Section: Comparative Performance Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                Comparative Classification Performance (ML vs Baseline)
              </CardTitle>
              <CardDescription>
                Side-by-side evaluation against identical ground-truth flow records from the
                dataset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-stone-200">
                  <thead className="border-b border-soc-border bg-soc-dark/60 text-xs font-semibold uppercase tracking-wider text-soc-muted">
                    <tr>
                      <th className="px-4 py-3">Metric</th>
                      <th className="px-4 py-3">Machine Learning (Random Forest)</th>
                      <th className="px-4 py-3">Heuristic Baseline (Rules)</th>
                      <th className="px-4 py-3">Absolute Advantage</th>
                      <th className="px-4 py-3">Scope &amp; Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soc-border/60">
                    {overallMetrics.map((row) => {
                      const mlVal = row.ml !== undefined ? row.ml : 0;
                      const baseVal = row.baseline !== undefined ? row.baseline : 0;
                      const delta = mlVal - baseVal;
                      const deltaPercent = (delta * 100).toFixed(1);

                      return (
                        <tr key={row.metric} className="hover:bg-soc-raised/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-stone-100">{row.metric}</td>
                          <td className="px-4 py-3 font-mono font-bold text-brand-primary text-base">
                            {(mlVal * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 font-mono text-stone-400">
                            {(baseVal * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                delta >= 0
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/50"
                                  : "bg-rose-950/60 text-rose-400 border border-rose-900/50"
                              }`}
                            >
                              {delta >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-soc-muted">{row.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section: Per-Class Recharts Comparison & Confusion Matrix Heatmap */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Recharts Per-Class F1 & Precision (6 cols) */}
            <div className="lg:col-span-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                    Per-Class F1-Score (ML vs Baseline)
                  </CardTitle>
                  <CardDescription>
                    Harmonic mean of precision and recall broken down by attack category.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={classComparisonData}
                        margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis
                          dataKey="name"
                          stroke="#a8a29e"
                          fontSize={11}
                          tickLine={false}
                          fontFamily="monospace"
                        />
                        <YAxis
                          stroke="#a8a29e"
                          fontSize={11}
                          tickLine={false}
                          domain={[0, 100]}
                          unit="%"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#171717",
                            borderColor: "#404040",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#f5f5f4"
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                          formatter={(value) => (
                            <span className="text-stone-300 font-medium">{value}</span>
                          )}
                        />
                        <Bar
                          dataKey="ML F1"
                          name="Random Forest F1"
                          fill="#38bdf8"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Baseline F1"
                          name="Heuristic Rule F1"
                          fill="#78716c"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Multi-Class Confusion Matrix Heatmap (6 cols) */}
            <div className="lg:col-span-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                    Random Forest Confusion Matrix
                  </CardTitle>
                  <CardDescription>
                    Actual Ground Truth (Rows) vs Model Predictions (Columns).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table
                      className="w-full text-center border-collapse text-xs"
                      aria-label="Multi-class Confusion Matrix Heatmap"
                    >
                      <thead>
                        <tr>
                          <th className="p-2 text-left font-mono text-[10px] uppercase text-soc-dim">
                            Actual \ Predicted
                          </th>
                          {EVALUATION_CLASSES.map((cls) => (
                            <th
                              key={cls}
                              className="p-2 font-mono font-semibold text-stone-300 border-b border-soc-border"
                            >
                              {cls}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {EVALUATION_CLASSES.map((trueClass) => (
                          <tr key={trueClass}>
                            <td className="p-2 text-left font-mono font-semibold text-stone-300 border-r border-soc-border">
                              {trueClass}
                            </td>
                            {EVALUATION_CLASSES.map((predClass) => {
                              const count = confusionMatrix[trueClass]?.[predClass] || 0;
                              const isDiagonal = trueClass === predClass;

                              let cellBg = "bg-soc-dark/30 text-stone-500";
                              if (count > 0) {
                                if (isDiagonal) {
                                  cellBg =
                                    "bg-cyan-950/40 text-cyan-300 font-bold border border-cyan-800/40";
                                } else {
                                  cellBg =
                                    "bg-rose-950/40 text-rose-300 font-medium border border-rose-800/30";
                                }
                              }

                              return (
                                <td key={predClass} className="p-2">
                                  <div
                                    className={`rounded-lg py-2.5 px-2 font-mono text-sm transition-colors ${cellBg}`}
                                    title={`True: ${trueClass}, Predicted: ${predClass} (${count} flows)`}
                                  >
                                    {count.toLocaleString()}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-soc-muted font-mono pt-2 border-t border-soc-border/60">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-cyan-950/70 border border-cyan-700/60 inline-block" />
                      Diagonal: Correct Classifications (TP)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-rose-950/70 border border-rose-700/60 inline-block" />
                      Off-Diagonal: Classification Errors (FP/FN)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section: False Positive / False Negative & Discrepancy Explorer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                Model Discrepancies &amp; Error Analysis
              </CardTitle>
              <CardDescription>
                Examine specific flow records where ML diverged from Ground Truth or the Heuristic
                Baseline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* False Positives Table */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-2">
                  False Positive Instances (Benign Traffic Flagged as Attack)
                </h2>
                {mlMetrics.falsePositivesExamples && mlMetrics.falsePositivesExamples.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-soc-border">
                    <table className="w-full text-left text-xs text-stone-300">
                      <thead className="bg-soc-dark/60 text-soc-muted uppercase tracking-wider font-semibold border-b border-soc-border">
                        <tr>
                          <th className="px-3 py-2">Ground Truth</th>
                          <th className="px-3 py-2">ML Prediction</th>
                          <th className="px-3 py-2">Threat Score</th>
                          <th className="px-3 py-2">Confidence</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-soc-border/40">
                        {mlMetrics.falsePositivesExamples.map((fp, idx) => (
                          <tr key={idx} className="hover:bg-soc-raised/20">
                            <td className="px-3 py-2 font-mono text-emerald-400">{fp.trueLabel}</td>
                            <td className="px-3 py-2 font-mono text-rose-400">
                              {fp.predictedClass}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold">{fp.threatScore}/100</td>
                            <td className="px-3 py-2 font-mono">
                              {(fp.confidence * 100).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right">
                              {fp.incidentId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedIncidentId(fp.incidentId);
                                    setIsIncidentModalOpen(true);
                                  }}
                                  className="text-brand-primary hover:underline text-[11px]"
                                >
                                  Inspect Incident &rarr;
                                </Button>
                              ) : (
                                <span className="text-soc-dim">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-soc-border/60 bg-soc-dark/30 p-3 text-xs text-soc-muted">
                    No false positive instances recorded in this sample evaluation.
                  </div>
                )}
              </div>

              {/* False Negatives Table */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-2">
                  False Negative Instances (Attacks Classified as Benign)
                </h2>
                {mlMetrics.falseNegativesExamples && mlMetrics.falseNegativesExamples.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-soc-border">
                    <table className="w-full text-left text-xs text-stone-300">
                      <thead className="bg-soc-dark/60 text-soc-muted uppercase tracking-wider font-semibold border-b border-soc-border">
                        <tr>
                          <th className="px-3 py-2">Row #</th>
                          <th className="px-3 py-2">Expected Attack Class</th>
                          <th className="px-3 py-2">ML Classification</th>
                          <th className="px-3 py-2">Reasoning Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-soc-border/40">
                        {mlMetrics.falseNegativesExamples.map((fn, idx) => (
                          <tr key={idx} className="hover:bg-soc-raised/20">
                            <td className="px-3 py-2 font-mono text-soc-muted">
                              Row {fn.rowNumber}
                            </td>
                            <td className="px-3 py-2 font-mono text-rose-400 font-semibold">
                              {fn.expectedClass}
                            </td>
                            <td className="px-3 py-2 font-mono text-emerald-400">
                              {fn.predictedClass}
                            </td>
                            <td className="px-3 py-2 text-soc-muted text-[11px]">
                              Flow packet statistics fell inside legitimate traffic boundary
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-soc-border/60 bg-soc-dark/30 p-3 text-xs text-soc-muted">
                    No false negative attacks observed in this sample evaluation.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section: Honest Limitations Panel (docs/ML_REPORT.md) */}
          <Card className="border-amber-900/40 bg-gradient-to-b from-soc-surface to-soc-dark/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-200">
                <Info className="h-5 w-5 text-amber-400" aria-hidden="true" />
                Real-World Operational Limitations &amp; Caveats
              </CardTitle>
              <CardDescription>
                Transparent operational boundary report derived from production security engineering
                practices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
                <div className="rounded-lg border border-soc-border bg-soc-surface/60 p-3.5 space-y-1.5">
                  <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    1. Offline Flow Termination Dependency
                  </div>
                  <p className="text-soc-muted leading-relaxed">
                    The 67 statistical features require bidirectional flow completion (FIN/RST
                    handshake or timeout). In live high-throughput environments, inference must
                    couple with sliding-window streaming accumulators.
                  </p>
                </div>

                <div className="rounded-lg border border-soc-border bg-soc-surface/60 p-3.5 space-y-1.5">
                  <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    2. Synthetic Testbed Artifacts (CIC-IDS2017)
                  </div>
                  <p className="text-soc-muted leading-relaxed">
                    Dataset flows originate from laboratory testbeds with fixed subnets and port
                    ranges. Modern attackers leverage evasive techniques (slow drip scans,
                    randomized headers, encrypted payload masquerading).
                  </p>
                </div>

                <div className="rounded-lg border border-soc-border bg-soc-surface/60 p-3.5 space-y-1.5">
                  <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    3. Extreme Production Class Imbalance
                  </div>
                  <p className="text-soc-muted leading-relaxed">
                    While the evaluation dataset contains balanced attack samples, live enterprise
                    networks are &gt;99.9% benign. A 0.5% false positive rate translates to hundreds
                    of daily alerts, mandating SOC triage thresholds.
                  </p>
                </div>

                <div className="rounded-lg border border-soc-border bg-soc-surface/60 p-3.5 space-y-1.5">
                  <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    4. Rule-Based Heuristic Baseline Fragility
                  </div>
                  <p className="text-soc-muted leading-relaxed">
                    The calibrated rule baseline fails whenever attacks fall below hardcoded
                    thresholds (e.g., slow port scans under 20 ports/min or low-rate HTTP DoS).
                    Random Forest captures multivariate correlations without static thresholds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Incident Detail Modal for Drilling into Discrepancies */}
      {selectedIncidentId && (
        <IncidentDetailModal
          incidentId={selectedIncidentId}
          isOpen={isIncidentModalOpen}
          onClose={() => {
            setIsIncidentModalOpen(false);
            setSelectedIncidentId(null);
          }}
        />
      )}
    </div>
  );
}
