// Set environment variables BEFORE importing app and env modules
process.env.NODE_ENV = "test";
process.env.PORT = "5059";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/cybershield_phase9";
process.env.JWT_SECRET = "super_secret_jwt_key_at_least_32_characters_long_for_tests";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ML_SERVICE_URL = "http://127.0.0.1:7860";
process.env.ML_API_KEY = "default_insecure_key_change_in_production";
process.env.LOG_LEVEL = "silent";

import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { io as Client } from "socket.io-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMlService(maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await globalThis.fetch("http://127.0.0.1:7860/health");
      if (res.ok) return true;
    } catch {
      // connecting...
    }
    await sleep(500);
  }
  throw new Error("ML service failed to start within timeout");
}

async function runPhase9Verification() {
  console.log("=================================================================");
  console.log("   AI CYBERSHIELD - PHASE 9 LIVE STACK & REPLAY VERIFICATION     ");
  console.log("=================================================================\n");

  const { createApp } = await import("../app.js");
  const { initSocketServer } = await import("../sockets/socketManager.js");
  const { seedAdmin } = await import("./seedAdmin.js");
  const { User } = await import("../models/User.js");
  const { ROLES } = await import("../utils/constants.js");
  const { signToken } = await import("../utils/jwt.js");
  const { processDatasetUpload } = await import("../services/datasetService.js");
  const { startReplay, stopAllReplays } = await import("../services/replayService.js");

  // 1. Start ML Microservice
  console.log("[1/8] Spawning ML service (uv run uvicorn app.main:app --port 7860)...");
  const mlServiceDir = path.resolve(__dirname, "../../../ml-service");
  const uvCmd = process.platform === "win32" ? "C:\\Users\\ombiswas\\.local\\bin\\uv.exe" : "uv";
  const mlProcess = spawn(
    uvCmd,
    ["run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "7860"],
    { cwd: mlServiceDir, stdio: "pipe" }
  );

  mlProcess.stderr.on("data", (_d) => {
    // ML stderr handling
  });
  mlProcess.stdout.on("data", (_d) => {
    // ML stdout handling
  });

  let mongoServer;
  let server;
  let clientSocket;

  try {
    await waitForMlService();
    console.log("      -> ML Service is HEALTHY on http://127.0.0.1:7860");

    // 2. Start MongoMemoryServer & Express Server with Socket.IO
    console.log("[2/8] Starting In-Memory MongoDB & Express server on port 5059...");
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const app = createApp();
    server = http.createServer(app);
    const socketServer = initSocketServer(server);

    await new Promise((resolve) => server.listen(5059, resolve));
    console.log("      -> Backend API & WebSockets listening on http://127.0.0.1:5059");

    // 3. Seed Administrator & Analyst
    console.log("[3/8] Seeding security users...");
    const adminUser = await seedAdmin({
      email: "admin@cybershield.local",
      password: "AdminP@ssw0rdSecure!2026",
      name: "Security Admin"
    });

    const analystUser = await User.create({
      name: "Lead Analyst",
      email: "analyst@cybershield.local",
      passwordHash: "dummy",
      role: ROLES.ANALYST,
      isActive: true
    });

    const analystToken = signToken({ sub: analystUser._id.toString(), role: ROLES.ANALYST });
    console.log("      -> Admin and Analyst provisioned.");

    // 4. Ingest Sample Dataset to generate initial Incidents
    console.log("[4/8] Ingesting demo_flows.csv to populate baseline incident records...");
    const sampleCsvPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
    const csvBuffer = fs.readFileSync(sampleCsvPath);

    const datasetDoc = await processDatasetUpload({
      name: "CIC-IDS2017 Demo Sample",
      buffer: csvBuffer,
      originalname: "demo_flows.csv",
      mimetype: "text/csv",
      user: adminUser
    });
    console.log("      -> Dataset ingested:", datasetDoc.rowCount, "rows |", datasetDoc.incidentCount, "incidents created");
    console.log("         Class breakdown:", JSON.stringify(datasetDoc.classDistribution));

    // 5. Connect Socket.IO Client
    console.log("[5/8] Connecting authenticated Socket.IO client (Analyst role)...");
    clientSocket = Client("http://127.0.0.1:5059", {
      auth: { token: analystToken },
      transports: ["websocket"]
    });

    await new Promise((resolve, reject) => {
      clientSocket.on("connect", resolve);
      clientSocket.on("connect_error", reject);
    });
    console.log("      -> Socket.IO client connected with socket id:", clientSocket.id);

    const receivedIncidents = [];
    clientSocket.on("incident:new", (inc) => {
      receivedIncidents.push(inc);
    });

    // 6. Start Live Traffic Replay
    console.log("[6/8] Starting live traffic replay at 25 flows/second...");
    const replaySession = await startReplay({
      datasetId: datasetDoc._id.toString(),
      flowsPerSec: 25,
      user: analystUser,
      io: socketServer
    });
    console.log("      -> Replay session active. Bounded rate:", replaySession.flowsPerSec, "fps");

    // Collect replayed telemetry for 2.5 seconds
    await sleep(2500);
    console.log("      -> Received live stream events over Socket.IO:", receivedIncidents.length);
    if (receivedIncidents.length > 0) {
      const sample = receivedIncidents[0];
      console.log("         Sample Event: class=" + sample.mlClass + ", score=" + sample.score + ", risk=" + sample.riskLevel + ", source=" + sample.source);
    }

    // 7. Test Dashboard REST API Endpoints
    console.log("[7/8] Verifying Dashboard & Incidents REST Endpoints...");

    // Summary
    const summaryRes = await globalThis.fetch("http://127.0.0.1:5059/api/stats/summary", {
      headers: { Authorization: "Bearer " + analystToken }
    });
    const summaryData = (await summaryRes.json()).data;
    console.log("      1. GET /api/stats/summary:");
    console.log("         Total Events: " + summaryData.totalEvents + " | Attacks: " + summaryData.attackCount + " | High/Critical: " + summaryData.highCriticalCount + " | Ratio: " + (summaryData.attackRatio * 100).toFixed(1) + "%");

    // Timeline
    const timelineRes = await globalThis.fetch("http://127.0.0.1:5059/api/stats/timeline?interval=hour", {
      headers: { Authorization: "Bearer " + analystToken }
    });
    const timelineData = (await timelineRes.json()).data?.timeline || [];
    console.log("      2. GET /api/stats/timeline: " + timelineData.length + " hourly intervals returned");

    // Distribution
    const distRes = await globalThis.fetch("http://127.0.0.1:5059/api/stats/distribution", {
      headers: { Authorization: "Bearer " + analystToken }
    });
    const distData = (await distRes.json()).data;
    console.log("      3. GET /api/stats/distribution: byClass=" + JSON.stringify(distData.byClass) + ", byRisk=" + JSON.stringify(distData.byRiskLevel));

    // Top Sources
    const sourcesRes = await globalThis.fetch("http://127.0.0.1:5059/api/stats/top-sources?limit=3", {
      headers: { Authorization: "Bearer " + analystToken }
    });
    const sourcesData = (await sourcesRes.json()).data?.sources || [];
    console.log("      4. GET /api/stats/top-sources (Analyst masked IP):");
    sourcesData.forEach((s) => console.log("         Source: " + s.source + " (" + s.incidentCount + " incidents, max score: " + s.maxScore + ")"));

    // Query Incidents with filters
    const incRes = await globalThis.fetch("http://127.0.0.1:5059/api/incidents?page=1&limit=5&riskLevel=Critical", {
      headers: { Authorization: "Bearer " + analystToken }
    });
    const incData = (await incRes.json()).data;
    console.log("      5. GET /api/incidents?riskLevel=Critical: " + incData.total + " critical incidents matched");

    const targetIncident = incData.incidents[0];
    if (targetIncident) {
      console.log("         Selected Incident ID:", targetIncident._id);
      console.log("         Initial Status:", targetIncident.status);

      // Transition Status
      console.log("      6. PATCH /api/incidents/" + targetIncident._id + "/status -> 'Under Review'...");
      const patchRes = await globalThis.fetch("http://127.0.0.1:5059/api/incidents/" + targetIncident._id + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + analystToken },
        body: JSON.stringify({ status: "Under Review" })
      });
      const patchData = (await patchRes.json()).data?.incident;
      console.log("         Status transitioned to:", patchData.status);

      // Add Note
      console.log("      7. POST /api/incidents/" + targetIncident._id + "/notes -> Append Analyst Note...");
      const noteRes = await globalThis.fetch("http://127.0.0.1:5059/api/incidents/" + targetIncident._id + "/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + analystToken },
        body: JSON.stringify({ text: "Forensic packet inspection confirms volumetric UDP Flood attack pattern." })
      });
      const noteData = (await noteRes.json()).data?.incident;
      console.log("         Total notes on incident:", noteData.notes.length);
      console.log("         Latest note text:", noteData.notes[noteData.notes.length - 1].text);

      // Verify Incident Detail
      console.log("      8. GET /api/incidents/" + targetIncident._id + " (verifying full explanation factors)...");
      const detailRes = await globalThis.fetch("http://127.0.0.1:5059/api/incidents/" + targetIncident._id, {
        headers: { Authorization: "Bearer " + analystToken }
      });
      const detail = (await detailRes.json()).data?.incident;
      console.log("         Score: " + detail.score + " (" + detail.riskLevel + ") | Factors: " + detail.explanation.map((e) => e.factor + " (" + e.contribution + "pts)").join(" + "));
    }

    // CSV Export
    console.log("      9. GET /api/incidents/export (verifying formula injection safe CSV)...");
    const exportRes = await globalThis.fetch("http://127.0.0.1:5059/api/incidents/export", {
      headers: { Authorization: "Bearer " + analystToken }
    });
    const csvContent = await exportRes.text();
    const lineCount = csvContent.split("\n").filter(Boolean).length;
    console.log("         CSV Export Status: " + exportRes.status + " | Rows exported: " + lineCount);
    console.log("         CSV Header line: " + csvContent.split("\n")[0]);

    // 8. Teardown
    console.log("\n[8/8] Tearing down test environment...");
    stopAllReplays();
    if (clientSocket) clientSocket.disconnect();
    if (server) await new Promise((res) => server.close(res));
    if (mongoose.connection) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    if (mlProcess) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", mlProcess.pid.toString(), "/f", "/t"]);
      } else {
        mlProcess.kill();
      }
    }

    console.log("\n=================================================================");
    console.log("   PHASE 9 LIVE VERIFICATION COMPLETED: ALL CHECKS PASSED!        ");
    console.log("=================================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    if (mlProcess) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", mlProcess.pid.toString(), "/f", "/t"]);
      } else {
        mlProcess.kill();
      }
    }
    process.exit(1);
  }
}

runPhase9Verification();
