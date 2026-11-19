import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { getSocket, onSocketStatusChange } from "../../services/socket.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { RiskBadge, AttackClassBadge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Radio, Play, Pause, Trash2, ArrowUpRight } from "lucide-react";

export const MAX_LIVE_FEED_ITEMS = 50;
const BATCH_INTERVAL_MS = 250;

export const LiveFeedPanel = memo(function LiveFeedPanel({ onSelectIncident }) {
  const [feedItems, setFeedItems] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedCount, setPausedCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState("disconnected");

  const pendingBatchRef = useRef([]);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  useEffect(() => {
    const unsubStatus = onSocketStatusChange((status) => {
      setSocketStatus(status);
    });
    return unsubStatus;
  }, []);

  // Flush buffer to state in controlled batches to prevent re-render storms
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingBatchRef.current.length > 0) {
        if (!isPausedRef.current) {
          const toAdd = [...pendingBatchRef.current];
          pendingBatchRef.current = [];
          setFeedItems((prev) => {
            const combined = [...toAdd.reverse(), ...prev];
            return combined.slice(0, MAX_LIVE_FEED_ITEMS);
          });
        }
      }
    }, BATCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Listen to live incident:new events from Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewIncident = (incident) => {
      if (!incident) return;

      if (isPausedRef.current) {
        setPausedCount((c) => c + 1);
        return;
      }

      pendingBatchRef.current.push(incident);
    };

    socket.on("incident:new", handleNewIncident);

    return () => {
      socket.off("incident:new", handleNewIncident);
    };
  }, [socketStatus]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (prev) {
        // Resuming: clear paused count
        setPausedCount(0);
      }
      return !prev;
    });
  }, []);

  const clearFeed = useCallback(() => {
    setFeedItems([]);
    setPausedCount(0);
    pendingBatchRef.current = [];
  }, []);

  const indicator = {
    connected: {
      label: "Live Telemetry",
      dot: "bg-emerald-400 animate-pulse",
      text: "text-emerald-400"
    },
    reconnecting: {
      label: "Reconnecting...",
      dot: "bg-amber-400 animate-ping",
      text: "text-amber-400"
    },
    connecting: { label: "Connecting...", dot: "bg-sky-400 animate-pulse", text: "text-sky-400" },
    disconnected: { label: "Socket Offline", dot: "bg-stone-500", text: "text-stone-400" },
    error: { label: "Connection Error", dot: "bg-rose-500", text: "text-rose-400" }
  }[socketStatus] || { label: "Offline", dot: "bg-stone-500", text: "text-stone-400" };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            <div>
              <CardTitle>Live Attack Flow Stream</CardTitle>
              <CardDescription>Real-time incident stream broadcast over Socket.IO</CardDescription>
            </div>
          </div>

          {/* Controls & Connection Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-soc-border bg-soc-dark/70 px-2.5 py-1 text-xs font-mono">
              <span className={`h-2 w-2 rounded-full ${indicator.dot}`} aria-hidden="true" />
              <span className={`text-[11px] font-semibold ${indicator.text}`}>
                {indicator.label}
              </span>
            </div>

            <Button
              variant={isPaused ? "primary" : "secondary"}
              size="sm"
              onClick={togglePause}
              iconLeft={
                isPaused ? (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                )
              }
            >
              {isPaused ? `Resume (${pausedCount})` : "Pause"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={clearFeed}
              aria-label="Clear live feed"
              iconLeft={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="max-h-[360px] overflow-y-auto divide-y divide-soc-border/40 px-5">
          {feedItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-soc-muted">
              {socketStatus === "connected" ? (
                <span>
                  Listening on WebSocket... Attack incidents from traffic replays will stream here
                  live.
                </span>
              ) : (
                <span>Waiting for WebSocket connection to stream live events...</span>
              )}
            </div>
          ) : (
            feedItems.map((incident, idx) => {
              const score = incident.score || 0;
              const risk =
                incident.riskLevel ||
                (score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 30 ? "Medium" : "Low");
              const isRecent = idx < 3;

              return (
                <div
                  key={incident._id || incident.id || `${incident.detectedAt}-${idx}`}
                  onClick={() => onSelectIncident?.(incident)}
                  className={`group flex items-center justify-between py-2.5 px-2 -mx-2 rounded transition-colors cursor-pointer hover:bg-soc-raised/80 ${
                    isRecent ? "bg-brand-primary/5" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onSelectIncident?.(incident);
                    }
                  }}
                >
                  {/* Left: Time & Source */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] text-soc-muted shrink-0">
                      {incident.detectedAt
                        ? new Date(incident.detectedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })
                        : "Just now"}
                    </span>

                    <AttackClassBadge attackClass={incident.mlClass} />

                    <span className="font-mono text-xs font-semibold text-stone-200 truncate">
                      {incident.source || "192.168.1.xxx"}
                    </span>
                  </div>

                  {/* Right: Score, Risk & Detail arrow */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="font-mono text-xs font-bold text-stone-100">Score: {score}</div>
                    <RiskBadge risk={risk} showIcon={false} />
                    <ArrowUpRight
                      className="h-3.5 w-3.5 text-stone-500 group-hover:text-stone-200 transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {feedItems.length > 0 && (
          <div className="border-t border-soc-border/60 bg-soc-dark/30 px-5 py-2 text-[11px] text-soc-dim flex justify-between items-center">
            <span>
              Showing latest {feedItems.length} of max {MAX_LIVE_FEED_ITEMS} buffered events
            </span>
            {isPaused && (
              <span className="text-amber-400 font-semibold animate-pulse">Feed paused</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
