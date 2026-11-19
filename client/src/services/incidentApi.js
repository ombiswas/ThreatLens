import { api } from "./api.js";

/**
 * Fetch paginated and filtered incidents.
 * @param {object} params
 */
export async function fetchIncidents(params = {}) {
  const cleanParams = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      cleanParams[key] = val;
    }
  }
  const data = await api.get("/api/incidents", { params: cleanParams });
  return data;
}

/**
 * Fetch single incident with notes and full factor explanation.
 * @param {string} id
 */
export async function fetchIncidentById(id) {
  const data = await api.get(`/api/incidents/${id}`);
  return data?.incident || data;
}

/**
 * Transition incident triage status.
 * @param {string} id
 * @param {string} status
 */
export async function updateIncidentStatus(id, status) {
  const data = await api.patch(`/api/incidents/${id}/status`, { status });
  return data?.incident || data;
}

/**
 * Add analytical note to an incident.
 * @param {string} id
 * @param {string} text
 */
export async function addIncidentNote(id, text) {
  const data = await api.post(`/api/incidents/${id}/notes`, { text });
  return data?.incident || data;
}

/**
 * Safe CSV export helper. Downloads file directly in browser without formula injection hazards.
 * @param {object} params
 */
export async function exportIncidentsCsv(params = {}) {
  const cleanParams = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      cleanParams[key] = val;
    }
  }

  // Use raw axios request via api.get with responseType blob
  const response = await api.get("/api/incidents/export", {
    params: cleanParams,
    responseType: "blob"
  });

  // Create safe blob download
  const blob = new Blob([response], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("download", `incidents-export-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
