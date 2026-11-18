import {
  getStatsSummary,
  getStatsTimeline,
  getStatsDistribution,
  getTopSources
} from "../services/statsService.js";
import { timelineQuerySchema, topSourcesQuerySchema } from "../validators/statsValidators.js";

export async function getStatsSummaryHandler(req, res) {
  const data = await getStatsSummary();
  res.status(200).json({ status: "success", data });
}

export async function getStatsTimelineHandler(req, res) {
  const parsed = timelineQuerySchema.parse(req.query);
  const data = await getStatsTimeline(parsed);
  res.status(200).json({ status: "success", data: { timeline: data } });
}

export async function getStatsDistributionHandler(req, res) {
  const data = await getStatsDistribution();
  res.status(200).json({ status: "success", data });
}

export async function getTopSourcesHandler(req, res) {
  const parsed = topSourcesQuerySchema.parse(req.query);
  const data = await getTopSources({ limit: parsed.limit, user: req.user });
  res.status(200).json({ status: "success", data: { sources: data } });
}
