import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { Dataset } from "../models/Dataset.js";
import { Incident } from "../models/Incident.js";
import { detectFlow } from "./detectionService.js";
import { checkAndTriggerAlert } from "./alertService.js";
import { emitNewIncident, emitReplayProgress } from "../sockets/socketManager.js";
import { FEATURE_NAMES } from "../validators/detectValidators.js";
import { AppError, NotFoundError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Map tracking active replays: userId -> ReplaySession
const activeReplays = new Map();

/**
 * Loads flow records from dataset rawCsv or fallback demo dataset.
 *
 * @param {string} datasetId
 * @returns {Promise<{ records: Array<object>, datasetName: string }>}
 */
async function loadReplayRecords(datasetId) {
  let csvContent = null;
  let datasetName = "Dataset Replay";

  if (datasetId === "demo" || !datasetId.match(/^[0-9a-fA-F]{24}$/)) {
    const demoPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
    if (!fs.existsSync(demoPath)) {
      throw new NotFoundError("Demo dataset file not found on disk");
    }
    csvContent = fs.readFileSync(demoPath, "utf8");
    datasetName = "CIC-IDS2017 Demo Sample";
  } else {
    const dataset = await Dataset.findById(datasetId).select("+rawCsv");
    if (!dataset) {
      throw new NotFoundError(`Dataset with ID '${datasetId}' not found`);
    }
    datasetName = dataset.name;
    if (dataset.rawCsv) {
      csvContent = dataset.rawCsv;
    } else {
      // Fallback to demo flows if rawCsv not stored on this record
      const demoPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
      if (fs.existsSync(demoPath)) {
        csvContent = fs.readFileSync(demoPath, "utf8");
      } else {
        throw new AppError("No raw CSV content stored for this dataset", 400, "DATASET_NO_CONTENT");
      }
    }
  }

  // Parse CSV records synchronously
  const rawRows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const parsedRecords = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const flow = {};
    let valid = true;

    for (const feat of FEATURE_NAMES) {
      const val = parseFloat(row[feat]);
      if (Number.isNaN(val) || !Number.isFinite(val)) {
        valid = false;
        break;
      }
      flow[feat] = val;
    }

    if (!valid) continue;

    parsedRecords.push({
      flow,
      meta: {
        label: row.Label || row.label || row.Class || row.class || "Unknown",
        source: row["Source IP"] || row.source_ip || `192.168.1.${(i % 250) + 1}`,
        destination: row["Destination IP"] || row.destination_ip || "10.0.0.1",
        protocol: row.Protocol || row.protocol || "TCP"
      }
    });
  }

  if (parsedRecords.length === 0) {
    throw new AppError(
      "Dataset contains no valid numeric flow records for replay",
      400,
      "NO_VALID_RECORDS"
    );
  }

  return { records: parsedRecords, datasetName };
}

/**
 * Starts an automated replay session for an authenticated user.
 *
 * @param {object} params
 * @param {string} params.datasetId
 * @param {number} [params.ratePerSecond=10]
 * @param {object} params.user
 * @param {import("socket.io").Server} [params.io]
 * @returns {Promise<object>} Session summary
 */
export async function startReplay({ datasetId, ratePerSecond = 10, user, io = null }) {
  const userId = user._id.toString();

  // Enforce one active replay per user
  if (activeReplays.has(userId)) {
    throw new AppError(
      "A replay session is already active for this account. Stop the active replay first.",
      409,
      "REPLAY_ALREADY_ACTIVE"
    );
  }

  const boundedRate = Math.min(50, Math.max(1, parseInt(ratePerSecond, 10) || 10));
  const { records, datasetName } = await loadReplayRecords(datasetId);

  const session = {
    userId,
    datasetId,
    datasetName,
    ratePerSecond: boundedRate,
    currentIndex: 0,
    totalRows: records.length,
    incidentsCount: 0,
    startTime: Date.now(),
    timer: null,
    isProcessingTick: false,
    stopped: false
  };

  activeReplays.set(userId, session);

  // Tick interval calculation
  // E.g. at 10 rps, tick every 200ms processing 2 records
  const tickIntervalMs = 200;
  const recordsPerTick = Math.max(1, Math.round(boundedRate * (tickIntervalMs / 1000)));

  session.timer = globalThis.setInterval(async () => {
    if (session.isProcessingTick || session.stopped) return;
    session.isProcessingTick = true;

    try {
      const sliceEnd = Math.min(session.currentIndex + recordsPerTick, session.totalRows);
      const batchSlice = records.slice(session.currentIndex, sliceEnd);
      session.currentIndex = sliceEnd;

      for (const item of batchSlice) {
        try {
          const result = await detectFlow(item.flow);

          // If non-Benign, persist incident and emit alerts
          if (result.mlClass !== "Benign") {
            session.incidentsCount += 1;

            const incident = await Incident.create({
              detectedAt: new Date(),
              source: item.meta.source,
              destination: item.meta.destination,
              protocol: item.meta.protocol,
              mlClass: result.mlClass,
              confidence: result.confidence,
              baselineClass: result.baselineClass,
              score: result.score,
              riskLevel: result.riskLevel,
              explanation: result.explanation,
              status: "New",
              datasetId: datasetId !== "demo" ? datasetId : null,
              groundTruthLabel: item.meta.label,
              createdBy: user._id
            });

            if (io) {
              emitNewIncident(io, incident);
              await checkAndTriggerAlert({ incident, io, datasetId: session.datasetId });
            }
          }
        } catch (err) {
          logger.error({ msg: "Error processing replay flow item", error: err.message });
        }
      }

      const progress = Math.min(100, Math.round((session.currentIndex / session.totalRows) * 100));

      if (io) {
        emitReplayProgress(
          io,
          {
            datasetId: session.datasetId,
            progress,
            processedRows: session.currentIndex,
            totalRows: session.totalRows,
            incidentsCount: session.incidentsCount,
            ratePerSecond: session.ratePerSecond,
            status: session.currentIndex >= session.totalRows ? "completed" : "running"
          },
          userId
        );
      }

      if (session.currentIndex >= session.totalRows) {
        globalThis.clearInterval(session.timer);
        activeReplays.delete(userId);
        logger.info({
          msg: "Replay session completed",
          userId,
          datasetId: session.datasetId,
          totalRows: session.totalRows,
          incidents: session.incidentsCount
        });
      }
    } catch (err) {
      logger.error({ msg: "Fatal error inside replay tick loop", error: err.message });
      globalThis.clearInterval(session.timer);
      activeReplays.delete(userId);
    } finally {
      session.isProcessingTick = false;
    }
  }, tickIntervalMs);

  logger.info({
    msg: "Replay session started",
    userId,
    datasetId,
    totalRows: records.length,
    ratePerSecond: boundedRate
  });

  return {
    status: "started",
    datasetId,
    datasetName,
    ratePerSecond: boundedRate,
    totalRows: records.length
  };
}

/**
 * Stops the active replay session for a user.
 *
 * @param {string} userId
 * @param {import("socket.io").Server} [io]
 * @returns {object} Status result
 */
export function stopReplay(userId, io = null) {
  const session = activeReplays.get(userId);
  if (!session) {
    return { status: "not_active", message: "No active replay session found" };
  }

  session.stopped = true;
  if (session.timer) {
    globalThis.clearInterval(session.timer);
  }
  activeReplays.delete(userId);

  if (io) {
    emitReplayProgress(
      io,
      {
        datasetId: session.datasetId,
        progress: Math.round((session.currentIndex / session.totalRows) * 100),
        processedRows: session.currentIndex,
        totalRows: session.totalRows,
        incidentsCount: session.incidentsCount,
        status: "stopped"
      },
      userId
    );
  }

  logger.info({ msg: "Replay session stopped", userId, datasetId: session.datasetId });

  return {
    status: "stopped",
    processedRows: session.currentIndex,
    totalRows: session.totalRows,
    incidentsCount: session.incidentsCount
  };
}

/**
 * Retrieves the current status of the user's active replay.
 *
 * @param {string} userId
 * @returns {object} Replay status
 */
export function getReplayStatus(userId) {
  const session = activeReplays.get(userId);
  if (!session) {
    return { active: false };
  }

  return {
    active: true,
    datasetId: session.datasetId,
    datasetName: session.datasetName,
    progress: Math.round((session.currentIndex / session.totalRows) * 100),
    processedRows: session.currentIndex,
    totalRows: session.totalRows,
    incidentsCount: session.incidentsCount,
    ratePerSecond: session.ratePerSecond,
    elapsedMs: Date.now() - session.startTime
  };
}

/**
 * Gracefully stops all active replay sessions across the server.
 */
export function stopAllReplays() {
  for (const [userId, session] of activeReplays.entries()) {
    if (session.timer) {
      globalThis.clearInterval(session.timer);
    }
    logger.info({ msg: "Cleared active replay during server shutdown", userId });
  }
  activeReplays.clear();
}
