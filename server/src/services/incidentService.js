import { Incident } from "../models/Incident.js";
import { maskIp } from "../utils/ipMask.js";
import { logAuditEvent } from "./auditService.js";
import {
  ROLES,
  AUDIT_ACTIONS,
  INCIDENT_STATUSES,
  VALID_STATUS_TRANSITIONS,
  RISK_LEVELS,
  ATTACK_CLASSES
} from "../utils/constants.js";
import { NotFoundError, ValidationError } from "../errors/AppError.js";

export const MAX_INCIDENT_EXPORT_ROWS = 5000;

/**
 * Sanitizes cell values to neutralize spreadsheet formula injection.
 * Prepends a single quote (') if the cell starts with '=', '+', '-', or '@'.
 *
 * @param {any} value
 * @returns {string} Safe CSV cell string
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value).trim();
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    return `'${str}`;
  }

  // Escape quotes if value contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Maps query filters into a sanitized Mongoose query object.
 * Strictly prevents NoSQL operator injection.
 *
 * @param {object} filters
 * @returns {object} Mongo query filter
 */
function buildSafeIncidentQuery(filters) {
  const query = {};

  if (filters.status && Object.values(INCIDENT_STATUSES).includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.riskLevel && Object.values(RISK_LEVELS).includes(filters.riskLevel)) {
    query.riskLevel = filters.riskLevel;
  }

  const targetClass = filters.mlClass || filters.class;
  if (targetClass && Object.values(ATTACK_CLASSES).includes(targetClass)) {
    query.mlClass = targetClass;
  }

  if (
    filters.datasetId &&
    typeof filters.datasetId === "string" &&
    filters.datasetId.match(/^[0-9a-fA-F]{24}$/)
  ) {
    query.datasetId = filters.datasetId;
  }

  if (filters.startDate || filters.endDate) {
    query.detectedAt = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (!Number.isNaN(start.getTime())) {
        query.detectedAt.$gte = start;
      }
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (!Number.isNaN(end.getTime())) {
        query.detectedAt.$lte = end;
      }
    }
  }

  if (filters.search && typeof filters.search === "string") {
    const cleanSearch = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (cleanSearch.length > 0) {
      query.$or = [
        { source: { $regex: cleanSearch, $options: "i" } },
        { destination: { $regex: cleanSearch, $options: "i" } },
        { mlClass: { $regex: cleanSearch, $options: "i" } }
      ];
    }
  }

  return query;
}

/**
 * Retrieves paginated list of security incidents with role-based IP masking.
 *
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.sortBy="detectedAt"]
 * @param {string} [params.sortOrder="desc"]
 * @param {object} [params.filters={}]
 * @param {object} params.user - Requesting user
 * @returns {Promise<{ incidents: Array<object>, pagination: object }>}
 */
export async function getIncidents({
  page = 1,
  limit = 20,
  sortBy = "detectedAt",
  sortOrder = "desc",
  filters = {},
  user
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const allowedSortKeys = new Set(["detectedAt", "score", "riskLevel", "status", "mlClass"]);
  const sortKey = allowedSortKeys.has(sortBy) ? sortBy : "detectedAt";
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const mongoQuery = buildSafeIncidentQuery(filters);

  const [total, rawIncidents] = await Promise.all([
    Incident.countDocuments(mongoQuery),
    Incident.find(mongoQuery)
      .sort({ [sortKey]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const isNonAdmin = !user || user.role !== ROLES.ADMIN;

  const incidents = rawIncidents.map((incident) => {
    if (isNonAdmin) {
      return {
        ...incident,
        source: maskIp(incident.source),
        destination: maskIp(incident.destination)
      };
    }
    return incident;
  });

  return {
    incidents,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1
    }
  };
}

/**
 * Retrieves a single incident by ID.
 *
 * @param {string} id - Incident ID
 * @param {object} user - Requesting user
 * @returns {Promise<object>}
 */
export async function getIncidentById(id, user) {
  const incident = await Incident.findById(id).lean();
  if (!incident) {
    throw new NotFoundError("Incident not found");
  }

  const isNonAdmin = !user || user.role !== ROLES.ADMIN;
  if (isNonAdmin) {
    incident.source = maskIp(incident.source);
    incident.destination = maskIp(incident.destination);
  }

  return incident;
}

/**
 * Updates triage status of an incident with transition validation and audit logging.
 *
 * @param {string} id - Incident ID
 * @param {string} newStatus - New status ("New", "Under Review", "Resolved")
 * @param {object} user - Analyst/Admin performing update
 * @param {string} ip
 * @param {string} userAgent
 * @returns {Promise<Incident>}
 */
export async function updateIncidentStatus(
  id,
  newStatus,
  user,
  ip = "unknown",
  userAgent = "unknown"
) {
  const incident = await Incident.findById(id);
  if (!incident) {
    throw new NotFoundError("Incident not found");
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[incident.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new ValidationError(
      `Invalid status transition: cannot change status from '${incident.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(", ")}`
    );
  }

  const previousStatus = incident.status;
  incident.status = newStatus;
  await incident.save();

  await logAuditEvent({
    userId: user._id,
    action: AUDIT_ACTIONS.INCIDENT_STATUS_CHANGE,
    ip,
    userAgent,
    details: {
      incidentId: incident._id,
      previousStatus,
      newStatus
    }
  });

  return incident;
}

/**
 * Appends an analytical note to an incident.
 *
 * @param {string} id - Incident ID
 * @param {string} noteText - Note content
 * @param {object} user - Author user
 * @returns {Promise<Incident>}
 */
export async function addIncidentNote(id, noteText, user) {
  const incident = await Incident.findById(id);
  if (!incident) {
    throw new NotFoundError("Incident not found");
  }

  const cleanText = (noteText || "").trim();
  if (cleanText.length === 0) {
    throw new ValidationError("Note text cannot be empty");
  }
  if (cleanText.length > 1000) {
    throw new ValidationError("Note text cannot exceed 1000 characters");
  }

  incident.notes.push({
    author: user._id,
    authorName: user.name,
    text: cleanText,
    timestamp: new Date()
  });

  await incident.save();
  return incident;
}

/**
 * Generates CSV export for incidents with formula-injection neutralization.
 *
 * @param {object} filters - Filter options
 * @param {object} user - Requesting user
 * @param {string} ip
 * @param {string} userAgent
 * @returns {Promise<string>} Formatted CSV string
 */
export async function exportIncidentsCsv(
  filters = {},
  user,
  ip = "unknown",
  userAgent = "unknown"
) {
  const mongoQuery = buildSafeIncidentQuery(filters);
  const incidents = await Incident.find(mongoQuery)
    .sort({ detectedAt: -1 })
    .limit(MAX_INCIDENT_EXPORT_ROWS)
    .lean();

  const isNonAdmin = !user || user.role !== ROLES.ADMIN;

  const headers = [
    "Incident ID",
    "Detected At",
    "Source",
    "Destination",
    "Protocol",
    "ML Class",
    "Confidence",
    "Baseline Class",
    "Threat Score",
    "Risk Level",
    "Status",
    "Ground Truth"
  ];

  const rows = incidents.map((inc) => {
    const src = isNonAdmin ? maskIp(inc.source) : inc.source;
    const dst = isNonAdmin ? maskIp(inc.destination) : inc.destination;

    return [
      sanitizeCsvCell(inc._id),
      sanitizeCsvCell(inc.detectedAt ? inc.detectedAt.toISOString() : ""),
      sanitizeCsvCell(src),
      sanitizeCsvCell(dst),
      sanitizeCsvCell(inc.protocol),
      sanitizeCsvCell(inc.mlClass),
      sanitizeCsvCell(inc.confidence),
      sanitizeCsvCell(inc.baselineClass),
      sanitizeCsvCell(inc.score),
      sanitizeCsvCell(inc.riskLevel),
      sanitizeCsvCell(inc.status),
      sanitizeCsvCell(inc.groundTruthLabel || "")
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");

  await logAuditEvent({
    userId: user._id,
    action: AUDIT_ACTIONS.INCIDENT_EXPORT,
    ip,
    userAgent,
    details: {
      exportedRows: incidents.length,
      filters
    }
  });

  return csvContent;
}
