// Set environment variables BEFORE importing app and env modules
process.env.NODE_ENV = "test";
process.env.PORT = "5056";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/cybershield_verify";
process.env.JWT_SECRET = "super_secret_jwt_key_at_least_32_characters_long_for_tests";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ML_SERVICE_URL = "http://127.0.0.1:7860";
process.env.ML_API_KEY = "default_insecure_key_change_in_production";
process.env.LOG_LEVEL = "debug";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMlService(maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await globalThis.fetch("http://127.0.0.1:7860/health");
      if (res.ok) {
        return true;
      }
    } catch {
      // service starting up
    }
    await sleep(500);
  }
  throw new Error("ML service failed to start within timeout");
}

async function runPhase6Verification() {
  console.log("=================================================================");
  console.log("   AI CYBERSHIELD - PHASE 6 REAL DATASET & INCIDENT VERIFICATION ");
  console.log("=================================================================\n");

  // Dynamically import app modules after setting env variables
  const { createApp } = await import("../app.js");
  const { User } = await import("../models/User.js");
  const { ROLES } = await import("../utils/constants.js");
  const { signToken } = await import("../utils/jwt.js");

  // 1. Start ML Microservice locally via uv
  console.log("[1] Spawning ML service (uv run uvicorn app.main:app --port 7860)...");
  const mlServiceDir = path.resolve(__dirname, "../../../ml-service");
  const mlProcess = spawn(
    "uv",
    ["run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "7860"],
    {
      cwd: mlServiceDir,
      stdio: "pipe",
      shell: true
    }
  );

  mlProcess.stderr.on("data", (_data) => {
    // console.error(`[ml-service-err] ${_data}`);
  });

  try {
    await waitForMlService();
    console.log("    -> ML Service is HEALTHY and responsive on http://127.0.0.1:7860\n");

    // 2. Start MongoMemoryServer & Express Server
    console.log("[2] Starting In-Memory MongoDB & Express API Server...");
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    const app = createApp();
    const server = app.listen(5056);
    const baseUrl = "http://127.0.0.1:5056";
    console.log(`    -> MongoDB connected & API listening on ${baseUrl}\n`);

    // 3. Create Analyst & Admin users
    console.log("[3] Creating Analyst and Admin accounts...");
    const analyst = await User.create({
      name: "Security Analyst",
      email: "analyst@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ANALYST,
      isActive: true
    });
    const analystToken = signToken({ sub: analyst._id.toString(), role: ROLES.ANALYST });

    const admin = await User.create({
      name: "Lead Admin",
      email: "admin@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ADMIN,
      isActive: true
    });
    const adminToken = signToken({ sub: admin._id.toString(), role: ROLES.ADMIN });
    console.log("    -> Analyst & Admin JWT tokens generated\n");

    // 4. Read demo_flows.csv (stratified sample from CIC-IDS2017)
    const demoCsvPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
    const csvBuffer = fs.readFileSync(demoCsvPath);
    console.log(`[4] Loaded '${demoCsvPath}' (${(csvBuffer.length / 1024).toFixed(1)} KB)`);

    // 5. Upload Dataset via POST /api/datasets/upload
    console.log("[5] Dispatching POST /api/datasets/upload (multipart/form-data)...");
    const formData = new globalThis.FormData();
    const blob = new globalThis.Blob([csvBuffer], { type: "text/csv" });
    formData.append("file", blob, "demo_flows.csv");

    const uploadRes = await globalThis.fetch(`${baseUrl}/api/datasets/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${analystToken}`
      },
      body: formData
    });

    const uploadJson = await uploadRes.json();
    console.log(`    -> Status: ${uploadRes.status} ${uploadRes.statusText}`);
    console.log("    -> Response Payload:", JSON.stringify(uploadJson, null, 2));

    if (!uploadRes.ok) {
      throw new Error(
        `Upload failed with status ${uploadRes.status}: ${JSON.stringify(uploadJson)}`
      );
    }

    const datasetId = uploadJson.data?.dataset?._id;

    // 6. Query GET /api/datasets/:id
    console.log(`\n[6] Fetching Dataset Details: GET /api/datasets/${datasetId}...`);
    const getDatasetRes = await globalThis.fetch(`${baseUrl}/api/datasets/${datasetId}`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const datasetDetail = await getDatasetRes.json();
    console.log("    -> Dataset Summary:\n", JSON.stringify(datasetDetail.data?.dataset, null, 2));

    // 7. Query Incidents: GET /api/incidents?datasetId=...
    console.log(
      `\n[7] Querying Detected Incidents: GET /api/incidents?datasetId=${datasetId}&limit=5...`
    );
    const incidentsRes = await globalThis.fetch(
      `${baseUrl}/api/incidents?datasetId=${datasetId}&limit=5`,
      {
        headers: { Authorization: `Bearer ${analystToken}` }
      }
    );
    const incidentsJson = await incidentsRes.json();
    const incidentsList = incidentsJson.data?.incidents || [];
    const totalIncidents = incidentsJson.data?.pagination?.total || incidentsJson.data?.total || 0;
    console.log(`    -> Total Incidents Found: ${totalIncidents}`);
    console.log(
      "    -> Sample First Incident Record:\n",
      JSON.stringify(incidentsList[0], null, 2)
    );

    const sampleIncidentId = incidentsList[0]._id;

    // 8. Update Incident Status: PATCH /api/incidents/:id/status
    console.log(
      `\n[8] Updating Incident Status: PATCH /api/incidents/${sampleIncidentId}/status -> 'Under Review'...`
    );
    const updateStatusRes = await globalThis.fetch(
      `${baseUrl}/api/incidents/${sampleIncidentId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${analystToken}`
        },
        body: JSON.stringify({ status: "Under Review" })
      }
    );
    const updatedStatusJson = await updateStatusRes.json();
    console.log(
      "    -> Updated Status Response:\n",
      JSON.stringify(updatedStatusJson.data?.incident?.status, null, 2)
    );

    // 9. Add Analyst Note: POST /api/incidents/:id/notes
    console.log(
      `\n[9] Adding Investigation Note: POST /api/incidents/${sampleIncidentId}/notes...`
    );
    const noteRes = await globalThis.fetch(`${baseUrl}/api/incidents/${sampleIncidentId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${analystToken}`
      },
      body: JSON.stringify({
        text: "Flagged during Phase 6 verification. Anomaly matches attack pattern."
      })
    });
    const noteJson = await noteRes.json();
    console.log("    -> Notes Array:\n", JSON.stringify(noteJson.data?.incident?.notes, null, 2));

    // 10. Export Incidents CSV: GET /api/incidents/export
    console.log(`\n[10] Exporting Incidents: GET /api/incidents/export?datasetId=${datasetId}...`);
    const exportRes = await globalThis.fetch(
      `${baseUrl}/api/incidents/export?datasetId=${datasetId}`,
      {
        headers: { Authorization: `Bearer ${analystToken}` }
      }
    );
    const exportCsv = await exportRes.text();
    const csvLines = exportCsv.trim().split("\n");
    console.log(`    -> Received CSV with ${csvLines.length} lines`);
    console.log(`    -> Header: ${csvLines[0]}`);
    console.log(`    -> Row 1:  ${csvLines[1]}`);

    // 11. Check Audit Logs (Admin only)
    console.log("\n[11] Inspecting Audit Logs: GET /api/audit-logs (as Admin)...");
    const auditRes = await globalThis.fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const auditJson = await auditRes.json();
    const actions = (auditJson.data?.logs || []).map(
      (l) => `${l.action} (${l.details?.datasetId || l.details?.incidentId || "N/A"})`
    );
    console.log("    -> Recent Audit Actions:", actions);

    // 12. Cleanup
    console.log("\n[12] Cleaning up test infrastructure...");
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log("    -> Express and MongoDB stopped.");

    console.log("\n=================================================================");
    console.log("   PHASE 6 VERIFICATION COMPLETED SUCCESSFULLY!");
    console.log("=================================================================");
    process.exit(0);
  } finally {
    mlProcess.kill();
  }
}

runPhase6Verification().catch((err) => {
  console.error("\nFATAL VERIFICATION ERROR:", err);
  process.exit(1);
});
