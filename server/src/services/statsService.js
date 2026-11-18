import { Incident } from "../models/Incident.js";
import { Dataset } from "../models/Dataset.js";
import { RISK_LEVELS, ROLES, ATTACK_CLASSES, INCIDENT_STATUSES } from "../utils/constants.js";
import { maskIp } from "../utils/ipMask.js";

/**
 * Returns overall SOC telemetry summary metrics.
 *
 * @returns {Promise<object>}
 */
export async function getStatsSummary() {
  const [datasetAgg, totalIncidents, highCriticalCount, criticalCount, activeIncidents] =
    await Promise.all([
      Dataset.aggregate([
        {
          $group: {
            _id: null,
            totalRows: { $sum: "$rowCount" },
            totalBenign: { $sum: "$benignCount" }
          }
        }
      ]),
      Incident.countDocuments(),
      Incident.countDocuments({
        riskLevel: { $in: [RISK_LEVELS.HIGH, RISK_LEVELS.CRITICAL] }
      }),
      Incident.countDocuments({ riskLevel: RISK_LEVELS.CRITICAL }),
      Incident.countDocuments({
        status: { $in: [INCIDENT_STATUSES.NEW, INCIDENT_STATUSES.UNDER_REVIEW] }
      })
    ]);

  const datasetRows = datasetAgg[0]?.totalRows || 0;
  const totalEvents = Math.max(totalIncidents, datasetRows);
  const attackRatio = totalEvents > 0 ? parseFloat((totalIncidents / totalEvents).toFixed(4)) : 0;

  return {
    totalEvents,
    attackCount: totalIncidents,
    highCriticalCount,
    criticalCount,
    activeIncidents,
    attackRatio
  };
}

/**
 * Returns time-bucketed incident counts and threat score averages.
 *
 * @param {object} params
 * @param {string} [params.interval="hour"] - "minute" | "hour" | "day"
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @returns {Promise<Array<object>>}
 */
export async function getStatsTimeline({ interval = "hour", startDate, endDate }) {
  const match = {};

  if (startDate || endDate) {
    match.detectedAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) match.detectedAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) match.detectedAt.$lte = end;
    }
  }

  let dateFormat = "%Y-%m-%dT%H:00:00Z";
  if (interval === "minute") {
    dateFormat = "%Y-%m-%dT%H:%M:00Z";
  } else if (interval === "day") {
    dateFormat = "%Y-%m-%d";
  }

  const pipeline = [
    ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: "$detectedAt" } },
        total: { $sum: 1 },
        critical: {
          $sum: { $cond: [{ $eq: ["$riskLevel", RISK_LEVELS.CRITICAL] }, 1, 0] }
        },
        high: {
          $sum: { $cond: [{ $eq: ["$riskLevel", RISK_LEVELS.HIGH] }, 1, 0] }
        },
        dos: {
          $sum: { $cond: [{ $eq: ["$mlClass", ATTACK_CLASSES.DOS_DDOS] }, 1, 0] }
        },
        portscan: {
          $sum: { $cond: [{ $eq: ["$mlClass", ATTACK_CLASSES.PORTSCAN] }, 1, 0] }
        },
        bruteforce: {
          $sum: { $cond: [{ $eq: ["$mlClass", ATTACK_CLASSES.BRUTEFORCE] }, 1, 0] }
        },
        avgScore: { $avg: "$score" }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await Incident.aggregate(pipeline);

  return results.map((r) => ({
    timestamp: r._id,
    total: r.total,
    critical: r.critical,
    high: r.high,
    byClass: {
      "DoS/DDoS": r.dos,
      PortScan: r.portscan,
      BruteForce: r.bruteforce
    },
    avgScore: Math.round((r.avgScore || 0) * 10) / 10
  }));
}

/**
 * Returns categorical distributions across class, risk level, status, and protocol.
 *
 * @returns {Promise<object>}
 */
export async function getStatsDistribution() {
  const [facets] = await Incident.aggregate([
    {
      $facet: {
        byClass: [{ $group: { _id: "$mlClass", count: { $sum: 1 } } }],
        byRiskLevel: [{ $group: { _id: "$riskLevel", count: { $sum: 1 } } }],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byProtocol: [{ $group: { _id: "$protocol", count: { $sum: 1 } } }]
      }
    }
  ]);

  const formatFacet = (arr) => {
    const res = {};
    for (const item of arr) {
      if (item._id) res[item._id] = item.count;
    }
    return res;
  };

  return {
    byClass: formatFacet(facets.byClass),
    byRiskLevel: formatFacet(facets.byRiskLevel),
    byStatus: formatFacet(facets.byStatus),
    byProtocol: formatFacet(facets.byProtocol)
  };
}

/**
 * Returns top attack source IPs with incident count and average threat score.
 *
 * @param {object} params
 * @param {number} [params.limit=5]
 * @param {object} params.user
 * @returns {Promise<Array<object>>}
 */
export async function getTopSources({ limit = 5, user }) {
  const boundedLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 5));
  const isNonAdmin = !user || user.role !== ROLES.ADMIN;

  const results = await Incident.aggregate([
    {
      $group: {
        _id: "$source",
        incidentCount: { $sum: 1 },
        avgScore: { $avg: "$score" },
        maxScore: { $max: "$score" },
        classes: { $addToSet: "$mlClass" },
        lastSeen: { $max: "$detectedAt" }
      }
    },
    { $sort: { incidentCount: -1 } },
    { $limit: boundedLimit }
  ]);

  return results.map((r) => ({
    source: isNonAdmin ? maskIp(r._id) : r._id,
    incidentCount: r.incidentCount,
    avgScore: Math.round((r.avgScore || 0) * 10) / 10,
    maxScore: r.maxScore,
    classes: r.classes,
    lastSeen: r.lastSeen
  }));
}
