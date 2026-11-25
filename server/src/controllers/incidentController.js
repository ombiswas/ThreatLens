import {
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  addIncidentNote,
  exportIncidentsCsv
} from "../services/incidentService.js";

export async function getIncidentsHandler(req, res) {
  const { page, limit, sortBy, sortOrder, sort, order, ...filters } = req.query;

  const result = await getIncidents({
    page,
    limit,
    sortBy: sortBy || sort,
    sortOrder: sortOrder || order,
    filters,
    user: req.user
  });

  res.status(200).json({
    status: "success",
    data: result
  });
}

export async function getIncidentByIdHandler(req, res) {
  const incident = await getIncidentById(req.params.id, req.user);

  res.status(200).json({
    status: "success",
    data: { incident }
  });
}

export async function updateIncidentStatusHandler(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const updatedIncident = await updateIncidentStatus(
    req.params.id,
    req.body.status,
    req.user,
    ip,
    userAgent
  );

  res.status(200).json({
    status: "success",
    data: { incident: updatedIncident }
  });
}

export async function addIncidentNoteHandler(req, res) {
  const updatedIncident = await addIncidentNote(req.params.id, req.body.text, req.user);

  res.status(201).json({
    status: "success",
    data: { incident: updatedIncident }
  });
}

export async function exportIncidentsCsvHandler(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const csvContent = await exportIncidentsCsv(req.query, req.user, ip, userAgent);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="incidents_export.csv"');
  res.status(200).send(csvContent);
}
