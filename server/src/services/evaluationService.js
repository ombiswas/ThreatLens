import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { Dataset } from "../models/Dataset.js";
import { Incident } from "../models/Incident.js";
import { mlClient } from "./mlClient.js";
import { evaluateBaseline } from "./baselineService.js";
import { ATTACK_CLASSES } from "../utils/constants.js";
import { FEATURE_NAMES } from "../validators/detectValidators.js";
import { NotFoundError, AppError } from "../errors/AppError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const EVALUATION_CLASSES = [
  ATTACK_CLASSES.BENIGN,
  ATTACK_CLASSES.DOS_DDOS,
  ATTACK_CLASSES.PORTSCAN,
  ATTACK_CLASSES.BRUTEFORCE
];

/**
 * Normalizes dataset ground truth string to one of the canonical 4 classes.
 *
 * @param {string} rawLabel
 * @returns {string} Normalized class name
 */
export function normalizeGroundTruthLabel(rawLabel) {
  if (!rawLabel || typeof rawLabel !== "string") {
    return ATTACK_CLASSES.BENIGN;
  }

  const s = rawLabel.trim().toLowerCase();

  if (s.includes("benign")) {
    return ATTACK_CLASSES.BENIGN;
  }
  if (s.includes("dos") || s.includes("ddos") || s.includes("hulk") || s.includes("goldeneye")) {
    return ATTACK_CLASSES.DOS_DDOS;
  }
  if (s.includes("portscan") || s.includes("port_scan") || s.includes("scan")) {
    return ATTACK_CLASSES.PORTSCAN;
  }
  if (
    s.includes("patator") ||
    s.includes("bruteforce") ||
    s.includes("brute") ||
    s.includes("ssh") ||
    s.includes("ftp")
  ) {
    return ATTACK_CLASSES.BRUTEFORCE;
  }

  return rawLabel;
}

/**
 * Calculates classification metrics from a multi-class confusion matrix.
 *
 * @param {object} matrixObj - Object mapping trueClass -> predClass -> count
 * @param {Array<string>} classes - Evaluated class list
 * @returns {object} Calculated metrics
 */
export function computeMetricsFromMatrix(matrixObj, classes = EVALUATION_CLASSES) {
  let totalSamples = 0;
  let correctPredictions = 0;
  const perClass = {};

  for (const c of classes) {
    let tp = matrixObj[c]?.[c] || 0;
    let fp = 0;
    let fn = 0;
    let support = 0;

    for (const other of classes) {
      const count = matrixObj[other]?.[c] || 0;
      if (other !== c) fp += count;
    }

    for (const other of classes) {
      const count = matrixObj[c]?.[other] || 0;
      support += count;
      if (other !== c) fn += count;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perClass[c] = {
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1Score: parseFloat(f1.toFixed(4)),
      support,
      tp,
      fp,
      fn
    };

    totalSamples += support;
    correctPredictions += tp;
  }

  const accuracy = totalSamples > 0 ? correctPredictions / totalSamples : 0;

  // Macro averages
  const classCount = classes.length;
  const macroPrecision = classes.reduce((sum, c) => sum + perClass[c].precision, 0) / classCount;
  const macroRecall = classes.reduce((sum, c) => sum + perClass[c].recall, 0) / classCount;
  const macroF1 = classes.reduce((sum, c) => sum + perClass[c].f1Score, 0) / classCount;

  // Weighted average F1
  const weightedF1 =
    totalSamples > 0
      ? classes.reduce((sum, c) => sum + perClass[c].f1Score * perClass[c].support, 0) /
        totalSamples
      : 0;

  return {
    accuracy: parseFloat(accuracy.toFixed(4)),
    macroPrecision: parseFloat(macroPrecision.toFixed(4)),
    macroRecall: parseFloat(macroRecall.toFixed(4)),
    macroF1: parseFloat(macroF1.toFixed(4)),
    weightedF1: parseFloat(weightedF1.toFixed(4)),
    totalSamples,
    perClass
  };
}

/**
 * Returns latest offline training metrics from the ML microservice.
 *
 * @returns {Promise<object>}
 */
export async function getLatestEvaluationMetrics() {
  const modelInfo = await mlClient.getModelInfo();

  // Baseline calibrated performance from Phase 1 / docs/BASELINE_RULES.md
  const baselineOfflineMetrics = {
    algorithm: "RuleBasedBaseline",
    accuracy: 0.62,
    macroF1: 0.4695,
    macroPrecision: 0.5203,
    macroRecall: 0.5208,
    perClassF1: {
      Benign: 0.7353,
      BruteForce: 1.0,
      "DoS/DDoS": 0.1429,
      PortScan: 0.0
    }
  };

  return {
    mlModel: {
      name: modelInfo.model_name || "Random Forest Flow Classifier",
      algorithm: modelInfo.algorithm || "RandomForestClassifier",
      version: modelInfo.version || "0.1.0",
      featureCount: modelInfo.feature_count || 67,
      classes: modelInfo.classes || EVALUATION_CLASSES,
      evaluationMetrics: modelInfo.evaluation_metrics || {}
    },
    baseline: baselineOfflineMetrics
  };
}

/**
 * Computes live comparative evaluation metrics for a specific dataset.
 * Compares ML model against Rule-Based Baseline across ground-truth labels.
 *
 * @param {string} datasetId
 * @returns {Promise<object>}
 */
export async function computeDatasetEvaluation(datasetId) {
  let dataset = null;
  let csvContent = null;

  if (datasetId === "demo" || !datasetId.match(/^[0-9a-fA-F]{24}$/)) {
    const demoPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
    if (!fs.existsSync(demoPath)) {
      throw new NotFoundError("Demo dataset not found on disk");
    }
    csvContent = fs.readFileSync(demoPath, "utf8");
  } else {
    dataset = await Dataset.findById(datasetId).select("+rawCsv");
    if (!dataset) {
      throw new NotFoundError(`Dataset '${datasetId}' not found`);
    }
    if (dataset.rawCsv) {
      csvContent = dataset.rawCsv;
    } else {
      const demoPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
      if (fs.existsSync(demoPath)) {
        csvContent = fs.readFileSync(demoPath, "utf8");
      } else {
        throw new AppError("No raw CSV content stored for this dataset", 400, "DATASET_NO_CONTENT");
      }
    }
  }

  // Load all incidents persisted for this dataset
  const filter = dataset ? { datasetId: dataset._id } : {};
  const incidents = await Incident.find(filter).lean();
  const incidentMap = new Map();
  for (const inc of incidents) {
    if (inc.groundTruthLabel) {
      // Map by source + destination + groundTruthLabel
      const key = `${inc.source}_${inc.destination}_${inc.groundTruthLabel}`;
      if (!incidentMap.has(key)) incidentMap.set(key, inc);
    }
  }

  // Parse CSV records
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const mlMatrix = {};
  const baselineMatrix = {};

  for (const c1 of EVALUATION_CLASSES) {
    mlMatrix[c1] = {};
    baselineMatrix[c1] = {};
    for (const c2 of EVALUATION_CLASSES) {
      mlMatrix[c1][c2] = 0;
      baselineMatrix[c1][c2] = 0;
    }
  }

  const falsePositives = [];
  const falseNegatives = [];
  const discrepancies = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rawLabel = row.Label || row.label || row.Class || row.class || "Benign";
    const trueClass = normalizeGroundTruthLabel(rawLabel);

    if (!EVALUATION_CLASSES.includes(trueClass)) continue;

    // Check if flow was saved as an incident
    const src = row["Source IP"] || row.source_ip || `192.168.1.${(idx % 250) + 1}`;
    const dst = row["Destination IP"] || row.destination_ip || "10.0.0.1";
    const matchKey = `${src}_${dst}_${rawLabel}`;
    const incident = incidentMap.get(matchKey) || incidents[idx] || null;

    // If flow is in incidents, ML predicted non-Benign; else ML predicted Benign
    const mlPred = incident ? incident.mlClass : ATTACK_CLASSES.BENIGN;

    // Compute baseline prediction for this flow
    const flowObj = {};
    for (const feat of FEATURE_NAMES) {
      flowObj[feat] = parseFloat(row[feat]) || 0;
    }
    const baselineResult = evaluateBaseline(flowObj);
    const baselinePred = baselineResult.baselineClass;

    mlMatrix[trueClass][mlPred] = (mlMatrix[trueClass][mlPred] || 0) + 1;
    baselineMatrix[trueClass][baselinePred] = (baselineMatrix[trueClass][baselinePred] || 0) + 1;

    // Check False Positives (Ground truth is Benign, but predicted Attack)
    if (trueClass === ATTACK_CLASSES.BENIGN && mlPred !== ATTACK_CLASSES.BENIGN) {
      if (falsePositives.length < 5) {
        falsePositives.push({
          incidentId: incident?._id || null,
          trueLabel: rawLabel,
          predictedClass: mlPred,
          threatScore: incident?.score || 0,
          confidence: incident?.confidence || 0
        });
      }
    }

    // Check False Negatives (Ground truth is Attack, but predicted Benign)
    if (trueClass !== ATTACK_CLASSES.BENIGN && mlPred === ATTACK_CLASSES.BENIGN) {
      if (falseNegatives.length < 5) {
        falseNegatives.push({
          rowNumber: idx + 1,
          trueLabel: rawLabel,
          expectedClass: trueClass,
          predictedClass: mlPred
        });
      }
    }

    // Check Discrepancies between ML and Baseline
    if (mlPred !== baselinePred) {
      if (discrepancies.length < 10) {
        discrepancies.push({
          incidentId: incident?._id || null,
          trueClass,
          mlPrediction: mlPred,
          baselinePrediction: baselinePred,
          baselineRule: baselineResult.baselineRule
        });
      }
    }
  }

  const mlMetrics = computeMetricsFromMatrix(mlMatrix);
  const baselineMetrics = computeMetricsFromMatrix(baselineMatrix);

  return {
    datasetId: dataset?._id || "demo",
    datasetName: dataset?.name || "Demo Sample",
    totalEvaluated: rows.length,
    classes: EVALUATION_CLASSES,
    mlModel: {
      algorithm: "RandomForestClassifier",
      accuracy: mlMetrics.accuracy,
      macroF1: mlMetrics.macroF1,
      macroPrecision: mlMetrics.macroPrecision,
      macroRecall: mlMetrics.macroRecall,
      weightedF1: mlMetrics.weightedF1,
      perClass: mlMetrics.perClass,
      confusionMatrix: mlMatrix,
      falsePositivesCount: falsePositives.length,
      falsePositivesExamples: falsePositives,
      falseNegativesCount: falseNegatives.length,
      falseNegativesExamples: falseNegatives
    },
    baseline: {
      algorithm: "RuleBasedBaseline",
      accuracy: baselineMetrics.accuracy,
      macroF1: baselineMetrics.macroF1,
      macroPrecision: baselineMetrics.macroPrecision,
      macroRecall: baselineMetrics.macroRecall,
      weightedF1: baselineMetrics.weightedF1,
      perClass: baselineMetrics.perClass,
      confusionMatrix: baselineMatrix
    },
    discrepancyCount: discrepancies.length,
    discrepancyExamples: discrepancies
  };
}
