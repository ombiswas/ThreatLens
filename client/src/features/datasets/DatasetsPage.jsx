import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Play,
  Square,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  Database,
  RefreshCw,
  Info
} from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { fetchDatasets, uploadDataset, deleteDataset } from "../../services/datasetApi.js";
import {
  fetchReplayStatus,
  startReplaySession,
  stopReplaySession
} from "../../services/replayApi.js";
import { onReplayProgress } from "../../services/socket.js";
import { validateDatasetCsv } from "./csvValidator.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { Spinner } from "../../components/ui/Spinner.jsx";
import { ROLES } from "../../utils/constants.js";

export function DatasetsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === ROLES.ADMIN;
  const canReplay = user?.role === ROLES.ADMIN || user?.role === ROLES.ANALYST;
  const canUpload = user?.role === ROLES.ADMIN || user?.role === ROLES.ANALYST;

  // File Upload State
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [datasetName, setDatasetName] = useState("");
  const [fileValidation, setFileValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Replay State
  const [selectedReplayDataset, setSelectedReplayDataset] = useState("demo");
  const [replayRate, setReplayRate] = useState(25);
  const [replayState, setReplayState] = useState({
    status: "idle",
    progress: 0,
    processedRows: 0,
    totalRows: 0,
    incidentsCount: 0,
    ratePerSecond: 25,
    datasetId: "demo"
  });

  // Delete Dialog State
  const [datasetToDelete, setDatasetToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 1. Fetch Datasets List
  const {
    data: datasets = [],
    isLoading: isDatasetsLoading,
    isFetching: isDatasetsFetching,
    refetch: refetchDatasets
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: fetchDatasets
  });

  const handleRefreshLibrary = useCallback(async () => {
    try {
      await Promise.all([
        refetchDatasets(),
        queryClient.invalidateQueries({ queryKey: ["datasets"] }),
        queryClient.invalidateQueries({ queryKey: ["replay-status"] })
      ]);
      addToast({
        title: "Library Refreshed",
        message: "Dataset inventory and replay statuses updated.",
        type: "success"
      });
    } catch (err) {
      addToast({
        title: "Refresh Failed",
        message: err.message || "Failed to refresh dataset inventory.",
        type: "error"
      });
    }
  }, [refetchDatasets, queryClient, addToast]);

  // 2. Fetch Active Replay Status on Mount
  const { data: initialReplayStatus } = useQuery({
    queryKey: ["replay-status"],
    queryFn: fetchReplayStatus,
    enabled: canReplay,
    staleTime: 5000
  });

  useEffect(() => {
    const active =
      initialReplayStatus?.active === true
        ? initialReplayStatus
        : initialReplayStatus?.activeReplay;

    if (active) {
      const processed = active.processedRows ?? active.currentIndex ?? 0;
      const total = active.totalRows || 0;
      const progress =
        total > 0
          ? Math.min(100, Math.round((processed / total) * 100))
          : (active.progress || 0);

      setReplayState({
        status: "running",
        progress,
        processedRows: processed,
        totalRows: total,
        incidentsCount: active.incidentsCount || 0,
        ratePerSecond: active.ratePerSecond || 25,
        datasetId: active.datasetId || "demo"
      });
      setSelectedReplayDataset(active.datasetId || "demo");
      setReplayRate(active.ratePerSecond || 25);
    }
  }, [initialReplayStatus]);

  // 3. Listen to Replay Progress over Socket.IO
  useEffect(() => {
    const unsubscribe = onReplayProgress((progressData) => {
      setReplayState({
        status: progressData.status || (progressData.progress >= 100 ? "completed" : "running"),
        progress: progressData.progress || 0,
        processedRows: progressData.processedRows || 0,
        totalRows: progressData.totalRows || 0,
        incidentsCount: progressData.incidentsCount || 0,
        ratePerSecond: progressData.ratePerSecond || 25,
        datasetId: progressData.datasetId
      });

      if (progressData.status === "completed" || progressData.progress >= 100) {
        addToast({
          title: "Replay Completed",
          message: `Finished streaming ${progressData.totalRows} flows (${progressData.incidentsCount} incidents detected).`,
          type: "success"
        });
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
      }
    });

    return unsubscribe;
  }, [addToast, queryClient]);

  // Handle File Selection
  const handleFileChange = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadResult(null);
    setUploadProgress(0);

    // Auto-fill dataset name if empty
    if (!datasetName) {
      const cleanName = file.name.replace(/\.csv$/i, "").replace(/[_-]+/g, " ");
      setDatasetName(cleanName);
    }

    setIsValidating(true);
    const result = await validateDatasetCsv(file);
    setFileValidation(result);
    setIsValidating(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFileChange(files[0]);
    }
  };

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, name }) => {
      const formData = new FormData();
      formData.append("file", file, file.name);
      if (name?.trim()) {
        formData.append("name", name.trim());
      }
      return uploadDataset(formData, (percent) => {
        setUploadProgress(percent);
        if (percent >= 100) {
          setIsProcessingUpload(true);
        }
      });
    },
    onSuccess: (response) => {
      setIsProcessingUpload(false);
      setUploadProgress(100);
      setUploadResult(response);
      addToast({
        title: "Dataset Ingested",
        message: `Successfully processed ${response?.rowCount || "all"} flows.`,
        type: "success"
      });
      // Reset form
      setSelectedFile(null);
      setDatasetName("");
      setFileValidation(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => {
      setIsProcessingUpload(false);
      setUploadProgress(0);
      addToast({
        title: "Upload Failed",
        message: err.message || "Failed to upload and parse dataset.",
        type: "error"
      });
    }
  });

  // Replay Start Mutation
  const startReplayMutation = useMutation({
    mutationFn: () =>
      startReplaySession({
        datasetId: selectedReplayDataset || "demo",
        ratePerSecond: Number(replayRate) || 25
      }),
    onSuccess: (data) => {
      const total = data?.totalRows || data?.session?.totalRows || 0;
      setReplayState({
        status: "running",
        progress: 0,
        processedRows: 0,
        totalRows: total,
        incidentsCount: 0,
        ratePerSecond: Number(replayRate) || 25,
        datasetId: selectedReplayDataset || "demo"
      });
      addToast({
        title: "Replay Started",
        message: `Streaming ${total > 0 ? total.toLocaleString() : "flows"} at ${replayRate} flows/sec.`,
        type: "info"
      });
      queryClient.invalidateQueries({ queryKey: ["replay-status"] });
    },
    onError: (err) => {
      if (err.code === "REPLAY_ALREADY_ACTIVE" || err.message?.includes("already active")) {
        setReplayState((prev) => ({ ...prev, status: "running" }));
        queryClient.invalidateQueries({ queryKey: ["replay-status"] });
      }
      addToast({
        title: "Replay Error",
        message: err.message || "Could not start traffic replay session.",
        type: "error"
      });
    }
  });

  // Replay Stop Mutation
  const stopReplayMutation = useMutation({
    mutationFn: stopReplaySession,
    onSuccess: () => {
      setReplayState((prev) => ({ ...prev, status: "stopped" }));
      addToast({
        title: "Replay Stopped",
        message: "Traffic replay paused by operator.",
        type: "warning"
      });
      queryClient.invalidateQueries({ queryKey: ["replay-status"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => {
      addToast({
        title: "Error Stopping Replay",
        message: err.message || "Could not halt replay session.",
        type: "error"
      });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteDataset(id),
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      setDatasetToDelete(null);
      addToast({
        title: "Dataset Deleted",
        message: "Dataset and associated incident flows removed.",
        type: "success"
      });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
    onError: (err) => {
      addToast({
        title: "Delete Failed",
        message: err.message || "Could not delete dataset.",
        type: "error"
      });
    }
  });

  const columns = [
    {
      key: "name",
      header: "Dataset Name",
      render: (name, row) => (
        <div>
          <div className="font-semibold text-stone-100">{name}</div>
          <div className="font-mono text-[11px] text-soc-muted">{row?.originalName}</div>
        </div>
      )
    },
    {
      key: "rowCount",
      header: "Flow Records",
      render: (rowCount) => (
        <span className="font-mono text-xs text-stone-200">
          {(rowCount || 0).toLocaleString()} flows
        </span>
      )
    },
    {
      key: "incidentCount",
      header: "Incidents",
      render: (incidentCount) => (
        <Badge variant={incidentCount > 0 ? "high" : "low"} size="sm">
          {incidentCount || 0} alerts
        </Badge>
      )
    },
    {
      key: "classDistribution",
      header: "Class Breakdown",
      render: (dist) => {
        const entries = Object.entries(dist || {}).filter(([, count]) => count > 0);
        if (entries.length === 0) return <span className="text-xs text-soc-dim">-</span>;
        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {entries.map(([cls, count]) => (
              <span
                key={cls}
                className="inline-flex items-center gap-1 rounded bg-soc-dark/80 px-1.5 py-0.5 text-[10px] font-mono text-stone-300 border border-soc-border/50"
              >
                <span>{cls}:</span>
                <span className="font-bold text-stone-100">{count}</span>
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: "createdAt",
      header: "Ingested",
      render: (createdAt) => (
        <span className="text-xs text-soc-muted">
          {createdAt
            ? new Date(createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
              })
            : "-"}
        </span>
      )
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDatasetToDelete(row);
                setIsDeleteModalOpen(true);
              }}
              className="text-rose-400 hover:bg-rose-950/40 hover:text-rose-200"
              aria-label={`Delete dataset ${row?.name || ""}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            Dataset Ingestion &amp; Traffic Replay
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-soc-muted">
            Upload CIC-IDS2017 network flow records or stream live flows through the ML detection
            engine.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefreshLibrary}
          disabled={isDatasetsFetching}
          isLoading={isDatasetsFetching}
          iconLeft={
            <RefreshCw
              className={`h-4 w-4 ${isDatasetsFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          }
        >
          Refresh Library
        </Button>
      </div>

      {/* Grid: Replay Controller & Upload Dropzone */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Replay Controller (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                  Traffic Replay Session
                </CardTitle>
                <Badge
                  variant={
                    replayState.status === "running"
                      ? "high"
                      : replayState.status === "completed"
                        ? "low"
                        : "neutral"
                  }
                  size="sm"
                >
                  {replayState.status === "running"
                    ? "Streaming"
                    : replayState.status === "completed"
                      ? "Completed"
                      : "Idle"}
                </Badge>
              </div>
              <CardDescription>
                Stream pre-recorded network flows through detection pipeline at a calibrated rate.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {!canReplay && (
                <div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3 text-xs text-amber-200 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
                  <span>
                    Analyst or Administrator privileges required to start or halt traffic replay.
                  </span>
                </div>
              )}

              {/* Dataset Selection */}
              <div className="space-y-1.5">
                <label
                  htmlFor="replay-dataset-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-300"
                >
                  Select Flow Source
                </label>
                <select
                  id="replay-dataset-select"
                  value={selectedReplayDataset}
                  onChange={(e) => setSelectedReplayDataset(e.target.value)}
                  disabled={!canReplay || replayState.status === "running"}
                  className="w-full rounded-lg border border-soc-border bg-soc-dark px-3 py-2 text-xs font-medium text-stone-100 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                >
                  <option value="demo">CIC-IDS2017 Demo Sample (1,000 flows)</option>
                  {datasets.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({(d.rowCount || 0).toLocaleString()} flows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Replay Rate Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                  <label htmlFor="replay-rate-slider">Injection Rate</label>
                  <span className="font-mono text-brand-primary font-bold">
                    {replayRate} flows/sec
                  </span>
                </div>
                <input
                  id="replay-rate-slider"
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={replayRate}
                  onChange={(e) => setReplayRate(Number(e.target.value))}
                  disabled={!canReplay || replayState.status === "running"}
                  className="w-full accent-brand-primary cursor-pointer disabled:opacity-50"
                  aria-valuemin={1}
                  aria-valuemax={50}
                  aria-valuenow={replayRate}
                  aria-label="Replay flow rate slider"
                />
                <div className="flex justify-between text-[10px] text-soc-dim font-mono">
                  <span>1 fps (Debug)</span>
                  <span>25 fps (Standard)</span>
                  <span>50 fps (Burst Max)</span>
                </div>
              </div>

              {/* Progress & Live Telemetry Box */}
              <div className="rounded-xl border border-soc-border/70 bg-soc-dark/70 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-soc-muted font-medium">Replay Progress</span>
                  <span className="font-mono font-bold text-stone-100">
                    {replayState.progress}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-soc-surface"
                  role="progressbar"
                  aria-valuenow={replayState.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-brand-primary transition-all duration-300"
                    style={{ width: `${replayState.progress}%` }}
                  />
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <div className="text-[11px] text-soc-muted">Flows Injected</div>
                    <div className="font-mono font-semibold text-stone-200">
                      {replayState.processedRows.toLocaleString()} /{" "}
                      {replayState.totalRows > 0 ? replayState.totalRows.toLocaleString() : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-soc-muted">Incidents Flagged</div>
                    <div className="font-mono font-semibold text-rose-400">
                      {replayState.incidentsCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {replayState.status === "running" ? (
                  <Button
                    variant="danger"
                    size="md"
                    className="w-full"
                    onClick={() => stopReplayMutation.mutate()}
                    isLoading={stopReplayMutation.isPending}
                    disabled={!canReplay || stopReplayMutation.isPending}
                    iconLeft={<Square className="h-4 w-4 fill-current" aria-hidden="true" />}
                  >
                    {stopReplayMutation.isPending ? "Halting Replay..." : "Halt Replay"}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      if (!canReplay) {
                        addToast({
                          title: "Permission Denied",
                          message: "Analyst or Administrator privileges required to run replay.",
                          type: "warning"
                        });
                        return;
                      }
                      startReplayMutation.mutate();
                    }}
                    isLoading={startReplayMutation.isPending}
                    disabled={!canReplay || startReplayMutation.isPending}
                    iconLeft={<Play className="h-4 w-4 fill-current" aria-hidden="true" />}
                  >
                    {startReplayMutation.isPending ? "Starting Replay..." : "Start Replay"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: CSV Drag & Drop Upload Zone (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                Ingest Network Flow Dataset (CSV)
              </CardTitle>
              <CardDescription>
                Upload CIC-IDS2017 flow exports (max 5 MB). Validates against 67 numerical flow
                features.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!canUpload && (
                <div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3 text-xs text-amber-200 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
                  <span>
                    Analyst or Administrator privileges required to upload datasets and run detection pipeline.
                  </span>
                </div>
              )}

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? "border-brand-primary bg-brand-primary/10"
                    : selectedFile
                      ? "border-emerald-600/60 bg-emerald-950/10"
                      : "border-soc-border hover:border-brand-primary/50 hover:bg-soc-dark/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soc-dark border border-soc-border">
                  {selectedFile ? (
                    <FileText className="h-6 w-6 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <UploadCloud className="h-6 w-6 text-stone-400" aria-hidden="true" />
                  )}
                </div>

                <div className="mt-3 text-xs sm:text-sm font-medium text-stone-200">
                  {selectedFile ? (
                    <span className="text-emerald-300 font-semibold">{selectedFile.name}</span>
                  ) : (
                    <>
                      <span className="text-brand-primary font-semibold hover:underline">
                        Click to select CSV
                      </span>{" "}
                      or drag &amp; drop file here
                    </>
                  )}
                </div>

                <p className="mt-1 text-[11px] text-soc-muted">
                  Requires RFC 4180 CSV with standard 67 CIC-IDS2017 feature headers &bull; Up to 5
                  MB
                </p>

                {selectedFile && (
                  <div className="mt-2 text-xs font-mono text-soc-muted">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>

              {/* Client-side Validation Status Preview */}
              {isValidating && (
                <div className="flex items-center gap-2 text-xs text-brand-primary">
                  <Spinner size="sm" />
                  <span>Validating CSV headers and file structure...</span>
                </div>
              )}

              {fileValidation && !isValidating && (
                <div
                  className={`rounded-lg p-3 text-xs border ${
                    fileValidation.valid
                      ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-300"
                      : "border-rose-800/60 bg-rose-950/20 text-rose-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {fileValidation.valid ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <AlertTriangle
                        className="h-4 w-4 shrink-0 text-rose-400 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <div className="font-semibold">
                        {fileValidation.valid ? "CSV Schema Verified" : "Client Validation Failed"}
                      </div>
                      <div className="mt-0.5 text-[11px] opacity-90">
                        {fileValidation.valid
                          ? `Valid header row detected with ${fileValidation.headerCount} columns. Meets CIC-IDS2017 specification.`
                          : fileValidation.error}
                      </div>

                      {fileValidation.missingFeatures &&
                        fileValidation.missingFeatures.length > 0 && (
                          <div className="mt-2 text-[10px] font-mono bg-rose-950/40 p-2 rounded border border-rose-900/50">
                            <div>Missing Required Features:</div>
                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                              {fileValidation.missingFeatures.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dataset Name Input */}
              <div className="space-y-1">
                <label
                  htmlFor="dataset-name-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-300"
                >
                  Dataset Name (Optional)
                </label>
                <input
                  id="dataset-name-input"
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. Wednesday Infiltration Sample"
                  disabled={uploadMutation.isPending || isProcessingUpload}
                  className="w-full rounded-lg border border-soc-border bg-soc-dark px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {/* Upload Progress Bar */}
              {uploadMutation.isPending && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-soc-muted">
                      {isProcessingUpload
                        ? "Streaming & ML Ingestion..."
                        : `Uploading: ${uploadProgress}%`}
                    </span>
                    <span className="font-bold text-stone-200">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-soc-dark">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isProcessingUpload ? "bg-amber-400 animate-pulse" : "bg-brand-primary"
                      }`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Action Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={
                    !canUpload ||
                    !selectedFile ||
                    !fileValidation?.valid ||
                    uploadMutation.isPending ||
                    isProcessingUpload
                  }
                  isLoading={uploadMutation.isPending || isProcessingUpload}
                  iconLeft={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => {
                    if (!canUpload) {
                      addToast({
                        title: "Permission Denied",
                        message:
                          "Analyst or Administrator privileges required to upload datasets.",
                        type: "warning"
                      });
                      return;
                    }
                    if (!selectedFile) {
                      addToast({
                        title: "No File Selected",
                        message: "Please select or drop a valid CIC-IDS2017 CSV file first.",
                        type: "warning"
                      });
                      return;
                    }
                    if (!fileValidation?.valid) {
                      addToast({
                        title: "Invalid Dataset",
                        message:
                          fileValidation?.error || "The selected file does not meet CSV requirements.",
                        type: "error"
                      });
                      return;
                    }
                    uploadMutation.mutate({
                      file: selectedFile,
                      name: datasetName
                    });
                  }}
                >
                  {isProcessingUpload
                    ? "Running ML Detection Pipeline..."
                    : uploadMutation.isPending
                      ? `Uploading (${uploadProgress}%)...`
                      : "Upload & Run Detection Pipeline"}
                </Button>
              </div>

              {/* Rejected Rows Report (if any reported by server) */}
              {(uploadResult?.rejectedRowsCount > 0 || uploadResult?.rejectedRows?.length > 0) && (
                <div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    <span>
                      {uploadResult.rejectedRowsCount || uploadResult.rejectedRows?.length} Malformed Rows Skipped
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-300/80">
                    Non-numeric or NaN values were skipped safely during streaming inference.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dataset Library Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                Ingested Datasets
              </CardTitle>
              <CardDescription>
                Catalog of processed network capture CSVs with extracted incident counts and class
                distributions.
              </CardDescription>
            </div>
            <span className="font-mono text-xs text-soc-muted">
              {datasets.length} {datasets.length === 1 ? "dataset" : "datasets"} registered
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={columns}
            data={datasets}
            isLoading={isDatasetsLoading}
            emptyMessage="No custom datasets uploaded. You can run replay sessions using the default demo sample or upload your own CIC-IDS2017 CSV file above."
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDatasetToDelete(null);
        }}
        onConfirm={() => {
          if (datasetToDelete?._id) {
            deleteMutation.mutate(datasetToDelete._id);
          }
        }}
        title="Delete Dataset"
        description={`Are you sure you want to delete dataset '${datasetToDelete?.name}'? All flow records and related incident entries will be permanently removed.`}
        confirmText="Delete Dataset"
        cancelText="Cancel"
        isDanger={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
