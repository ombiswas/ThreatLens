import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { Dataset } from "../models/Dataset.js";
import { Incident } from "../models/Incident.js";
import { FEATURE_NAMES } from "../validators/detectValidators.js";
import { detectBatch } from "./detectionService.js";
import { checkAndTriggerAlert } from "./alertService.js";
import { logAuditEvent } from "./auditService.js";
import { AUDIT_ACTIONS, INCIDENT_STATUSES } from "../utils/constants.js";
import { ValidationError, NotFoundError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

export const MAX_DATASET_ROWS = 20000;
export const MAX_REJECTED_ROWS_STORED = 100;
export const BATCH_PROCESSING_CHUNK_SIZE = 100;

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/csv",
  "text/x-csv"
]);

const OPTIONAL_METADATA_COLUMNS = new Set([
  "Label",
  "label",
  "Class",
  "class",
  "Source IP",
  "source_ip",
  "Destination IP",
  "destination_ip",
  "Protocol",
  "protocol",
  "Timestamp",
  "timestamp"
]);

const FEATURE_SET = new Set(FEATURE_NAMES);

/**
 * Validates file buffer, MIME type, extension, and content structure.
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} originalname - Uploaded file name
 * @param {string} mimetype - Declared MIME type
 * @returns {void}
 * @throws {ValidationError}
 */
export function validateCsvFileHeader(buffer, originalname, mimetype) {
  // 1. Extension check
  if (!originalname || !originalname.toLowerCase().endsWith(".csv")) {
    throw new ValidationError("Invalid file type: file must possess a .csv extension");
  }

  // 2. MIME type check
  if (!mimetype || !ALLOWED_MIME_TYPES.has(mimetype.toLowerCase())) {
    throw new ValidationError(`Invalid MIME type '${mimetype}': only text/csv is accepted`);
  }

  // 3. Content Sniffing: ensure text content and forbid binary executables
  const snippet = buffer.subarray(0, Math.min(buffer.length, 4096));

  // Check for DOS/Windows PE ("MZ") or Linux ELF binary magic numbers first
  if (
    (snippet[0] === 0x4d && snippet[1] === 0x5a) ||
    (snippet[0] === 0x7f && snippet[1] === 0x45 && snippet[2] === 0x4c && snippet[3] === 0x46)
  ) {
    throw new ValidationError("Executable files are forbidden");
  }

  // Check for binary null bytes
  if (snippet.includes(0x00)) {
    throw new ValidationError("File content validation failed: binary data or null bytes detected");
  }

  // Must contain a header with comma separation
  const firstLine = snippet.toString("utf8").split("\n")[0];
  if (!firstLine || !firstLine.includes(",")) {
    throw new ValidationError(
      "CSV file is malformed or does not contain a comma-separated header row"
    );
  }
}

/**
 * Validates parsed headers against the 67-feature whitelist.
 *
 * @param {Array<string>} headers - Header row column names
 * @throws {ValidationError}
 */
export function validateHeaderWhitelist(headers) {
  const headerSet = new Set(headers.map((h) => h.trim()));

  // Ensure all 67 required ML features are present
  for (const feature of FEATURE_NAMES) {
    if (!headerSet.has(feature)) {
      throw new ValidationError(`Required feature column '${feature}' is missing from CSV header`);
    }
  }

  // Reject any unrecognized columns
  for (const col of headerSet) {
    if (!FEATURE_SET.has(col) && !OPTIONAL_METADATA_COLUMNS.has(col)) {
      throw new ValidationError(
        `Unrecognized column '${col}' in CSV header. Header must strictly match feature schema.`
      );
    }
  }
}

/**
 * Ingests, validates, and processes a dataset CSV.
 * Streams rows, detects attacks via detectionService in chunks, and creates incidents.
 *
 * @param {object} params
 * @param {string} params.name - User dataset name
 * @param {Buffer} params.buffer - Uploaded file buffer
 * @param {string} params.originalname - Original file name
 * @param {string} params.mimetype - Declared MIME
 * @param {object} params.user - Uploading user
 * @param {string} [params.ip] - Uploading client IP
 * @param {string} [params.userAgent] - Uploading client User-Agent
 * @returns {Promise<Dataset>}
 */
export async function processDatasetUpload({
  name,
  buffer,
  originalname,
  mimetype,
  user,
  ip = "unknown",
  userAgent = "unknown"
}) {
  validateCsvFileHeader(buffer, originalname, mimetype);

  // Initial streaming pass to parse headers and stream records
  const parser = Readable.from(buffer).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false
    })
  );

  let headerChecked = false;
  let rowCount = 0;
  const validRows = [];
  const rowMeta = [];
  const rejectedRows = [];

  for await (const record of parser) {
    rowCount += 1;

    if (rowCount > MAX_DATASET_ROWS) {
      throw new ValidationError(
        `Dataset row count exceeds maximum limit of ${MAX_DATASET_ROWS} records`
      );
    }

    if (!headerChecked) {
      validateHeaderWhitelist(Object.keys(record));
      headerChecked = true;
    }

    // Validate feature values in this row
    let rowValid = true;
    let failureReason = "";
    const flowNumericRecord = {};

    for (const feature of FEATURE_NAMES) {
      const val = parseFloat(record[feature]);
      if (Number.isNaN(val) || !Number.isFinite(val)) {
        rowValid = false;
        failureReason = `Feature '${feature}' contains non-numeric value '${record[feature]}'`;
        break;
      }
      flowNumericRecord[feature] = val;
    }

    if (!rowValid) {
      if (rejectedRows.length < MAX_REJECTED_ROWS_STORED) {
        rejectedRows.push({ rowNumber: rowCount, reason: failureReason });
      }
      continue;
    }

    validRows.push(flowNumericRecord);
    rowMeta.push({
      label: record.Label || record.label || record.Class || record.class || null,
      source: record["Source IP"] || record.source_ip || `192.168.1.${(rowCount % 250) + 1}`,
      destination: record["Destination IP"] || record.destination_ip || "10.0.0.1",
      protocol: record.Protocol || record.protocol || "TCP"
    });
  }

  if (validRows.length === 0) {
    throw new ValidationError("Dataset does not contain any valid numeric flow records");
  }

  // Create Dataset document in database
  const dataset = await Dataset.create({
    name: name.trim(),
    originalFilename: originalname.replace(/[^a-zA-Z0-9._-]/g, "_"),
    sizeBytes: buffer.length,
    rowCount: validRows.length,
    status: "processing",
    progress: 0,
    rejectedRows,
    uploadedBy: user._id,
    rawCsv: buffer.toString("utf8")
  });

  // Batch process through detectionService
  let benignCount = 0;
  let incidentCount = 0;
  const classDistribution = {};

  try {
    for (let i = 0; i < validRows.length; i += BATCH_PROCESSING_CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + BATCH_PROCESSING_CHUNK_SIZE);
      const metaChunk = rowMeta.slice(i, i + BATCH_PROCESSING_CHUNK_SIZE);

      const detectionResults = await detectBatch(chunk);

      const incidentDocs = [];

      for (let j = 0; j < detectionResults.length; j++) {
        const result = detectionResults[j];
        const meta = metaChunk[j];

        // Track class distribution
        classDistribution[result.mlClass] = (classDistribution[result.mlClass] || 0) + 1;

        if (result.mlClass.toLowerCase() === "benign") {
          benignCount += 1;
        } else {
          incidentCount += 1;
          incidentDocs.push({
            detectedAt: new Date(),
            source: meta.source,
            destination: meta.destination,
            protocol: meta.protocol,
            mlClass: result.mlClass,
            confidence: result.confidence,
            baselineClass: result.baselineClass,
            score: result.score,
            riskLevel: result.riskLevel,
            explanation: result.explanation,
            status: INCIDENT_STATUSES.NEW,
            datasetId: dataset._id,
            groundTruthLabel: meta.label,
            createdBy: user._id
          });
        }
      }

      if (incidentDocs.length > 0) {
        const createdIncidents = await Incident.insertMany(incidentDocs);
        for (const inc of createdIncidents) {
          if (inc.riskLevel === "Critical") {
            await checkAndTriggerAlert({ incident: inc, datasetId: dataset._id });
          }
        }
      }

      const processedSoFar = i + chunk.length;
      dataset.progress = Math.min(99, Math.round((processedSoFar / validRows.length) * 100));
      await dataset.save();
    }

    dataset.benignCount = benignCount;
    dataset.incidentCount = incidentCount;
    dataset.classDistribution = classDistribution;
    dataset.status = "completed";
    dataset.progress = 100;
    await dataset.save();

    await logAuditEvent({
      userId: user._id,
      action: AUDIT_ACTIONS.DATASET_UPLOAD,
      ip,
      userAgent,
      details: {
        datasetId: dataset._id,
        datasetName: dataset.name,
        rowCount: dataset.rowCount,
        incidentCount
      }
    });

    return dataset;
  } catch (error) {
    dataset.status = "failed";
    await dataset.save().catch(() => {});
    logger.error({
      msg: "Dataset processing failed",
      datasetId: dataset._id,
      error: error.message
    });
    throw error;
  }
}

/**
 * Returns paginated list of uploaded datasets.
 *
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ datasets: Array<Dataset>, pagination: object }>}
 */
export async function getDatasets({ page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, datasets] = await Promise.all([
    Dataset.countDocuments(),
    Dataset.find()
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  return {
    datasets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1
    }
  };
}

/**
 * Retrieves a single dataset summary by ID.
 *
 * @param {string} id - Dataset ID
 * @returns {Promise<Dataset>}
 */
export async function getDatasetById(id) {
  const dataset = await Dataset.findById(id).populate("uploadedBy", "name email");
  if (!dataset) {
    throw new NotFoundError("Dataset not found");
  }
  return dataset;
}

/**
 * Deletes a dataset and all associated incidents (Admin only).
 *
 * @param {string} id - Dataset ID
 * @param {object} user - Admin user
 * @param {string} ip
 * @param {string} userAgent
 * @returns {Promise<{ message: string, deletedIncidents: number }>}
 */
export async function deleteDataset(id, user, ip = "unknown", userAgent = "unknown") {
  const dataset = await Dataset.findById(id);
  if (!dataset) {
    throw new NotFoundError("Dataset not found");
  }

  const deleteResult = await Incident.deleteMany({ datasetId: dataset._id });
  await Dataset.findByIdAndDelete(dataset._id);

  await logAuditEvent({
    userId: user._id,
    action: AUDIT_ACTIONS.DATASET_DELETE,
    ip,
    userAgent,
    details: {
      datasetId: dataset._id,
      datasetName: dataset.name,
      deletedIncidents: deleteResult.deletedCount
    }
  });

  return {
    message: "Dataset and associated incidents deleted successfully",
    deletedIncidents: deleteResult.deletedCount
  };
}
