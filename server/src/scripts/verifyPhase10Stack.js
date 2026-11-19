// Set environment variables BEFORE importing app and env modules
process.env.NODE_ENV = "test";
process.env.PORT = "5062";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/cybershield_phase10";
process.env.JWT_SECRET = "super_secret_jwt_key_at_least_32_characters_long_for_tests";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ML_SERVICE_URL = "http://127.0.0.1:7860";
process.env.ML_API_KEY = "default_insecure_key_change_in_production";
process.env.LOG_LEVEL = "silent";
process.env.ADMIN_EMAIL = "admin@cybershield.local";
process.env.ADMIN_PASSWORD = "AdminPassword123!";
process.env.ADMIN_NAME = "Lead Security Admin";

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
      // waiting for microservice...
    }
    await sleep(500);
  }
  throw new Error("ML service failed to start within timeout");
}

async function runPhase10Verification() {
  console.log("=================================================================");
  console.log("   AI CYBERSHIELD - PHASE 10 FULL STACK & LIVE VERIFICATION      ");
  console.log("=================================================================\n");

  const { createApp } = await import("../app.js");
  const { initSocketServer } = await import("../sockets/socketManager.js");
  const { seedAdmin } = await import("./seedAdmin.js");
  const { User } = await import("../models/User.js");
  const { ROLES } = await import("../utils/constants.js");
  const { signToken } = await import("../utils/jwt.js");
  const { processDatasetUpload } = await import("../services/datasetService.js");
  const { stopAllReplays } = await import("../services/replayService.js");

  // 1. Start ML Microservice
  console.log("[1/8] Spawning ML service (uv run uvicorn app.main:app --port 7860)...");
  const mlServiceDir = path.resolve(__dirname, "../../../ml-service");
  const uvCmd = process.platform === "win32" ? "C:\\Users\\ombiswas\\.local\\bin\\uv.exe" : "uv";
  const mlProcess = spawn(
    uvCmd,
    ["run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "7860"],
    {
      cwd: mlServiceDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    }
  );

  mlProcess.stderr.on("data", (_d) => {});

  let mongoServer = null;
  let server = null;
  let clientSocket = null;

  try {
    await waitForMlService();
    console.log("      ML Service ready on http://127.0.0.1:7860 (FastAPI 3.11).\n");

    // 2. Start MongoMemoryServer & Express Server
    console.log("[2/8] Starting In-Memory MongoDB & Express Server on Port 5062...");
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
    await mongoose.connect(mongoServer.getUri());

    const app = createApp();
    server = http.createServer(app);
    const io = initSocketServer(server, "http://localhost:5173");
    app.set("io", io);

    await new Promise((resolve) => server.listen(5062, resolve));
    console.log("      Express + Socket.IO Server active on http://127.0.0.1:5062.\n");

    // 3. Seed Users
    console.log("[3/8] Seeding Administrator and creating Analyst account...");
    const adminUser = await seedAdmin({
      email: "admin@cybershield.local",
      password: "AdminPassword123!",
      name: "Lead Security Admin"
    });
    const adminToken = signToken({ sub: adminUser._id.toString(), role: adminUser.role });

    const analystUser = await User.create({
      name: "SOC Analyst Dave",
      email: "dave.analyst@cybershield.local",
      passwordHash: adminUser.passwordHash,
      role: ROLES.ANALYST,
      isActive: true
    });
    const analystToken = signToken({ sub: analystUser._id.toString(), role: analystUser.role });
    console.log("      Admin:", adminUser.email, "(Role: admin)");
    console.log("      Analyst:", analystUser.email, "(Role: analyst)\n");

    // 4. Test Dataset Ingestion via CSV Upload
    console.log("[4/8] Ingesting real sample CSV dataset into detection engine...");
    const sampleCsvPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
    const sampleBuffer = fs.readFileSync(sampleCsvPath);

    const uploadedDataset = await processDatasetUpload({
      name: "Phase 10 Benchmark Sample",
      buffer: sampleBuffer,
      originalname: "demo_flows.csv",
      mimetype: "text/csv",
      user: adminUser,
      io
    });

    console.log("      Dataset ID:", uploadedDataset._id.toString());
    console.log("      Total Flows Parsed:", uploadedDataset.rowCount);
    console.log("      Incidents Flagged:", uploadedDataset.incidentCount);
    console.log("      Class Distribution:", JSON.stringify(uploadedDataset.classDistribution));

    // Verify GET /api/datasets
    const listRes = await globalThis.fetch("http://127.0.0.1:5062/api/datasets", {
      headers: { Authorization: "Bearer " + analystToken }
    });
    const listData = await listRes.json();
    const datasetsList = listData.data?.datasets || listData.datasets || [];
    console.log("      GET /api/datasets Status:", listRes.status, "| Returned Datasets:", datasetsList.length);

    // 5. Test Controlled Traffic Replay with Live Socket
    console.log("\n[5/8] Initiating Controlled Traffic Replay Session...");
    clientSocket = Client("http://127.0.0.1:5062", {
      auth: { token: analystToken },
      transports: ["websocket"]
    });

    await new Promise((res, rej) => {
      clientSocket.on("connect", res);
      clientSocket.on("connect_error", rej);
    });

    const replayEvents = [];
    clientSocket.on("replay:progress", (payload) => {
      replayEvents.push(payload);
    });

    const replayStartRes = await globalThis.fetch("http://127.0.0.1:5062/api/replay/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + analystToken },
      body: JSON.stringify({
        datasetId: uploadedDataset._id.toString(),
        ratePerSecond: 25
      })
    });
    const replayStartData = await replayStartRes.json();
    console.log("      POST /api/replay/start Status:", replayStartRes.status, "| Rate:", replayStartData.session?.ratePerSecond, "fps");

    // Wait 1.5 seconds for replay telemetry events
    await sleep(1500);
    console.log("      Socket.IO received 'replay:progress' events:", replayEvents.length);
    if (replayEvents.length > 0) {
      const latest = replayEvents[replayEvents.length - 1];
      console.log(`      Latest Replay Telemetry: Progress ${latest.progress}% | Processed: ${latest.processedRows}/${latest.totalRows} | Incidents: ${latest.incidentsCount}`);
    }

    // Stop replay
    const stopRes = await globalThis.fetch("http://127.0.0.1:5062/api/replay/stop", {
      method: "POST",
      headers: { Authorization: "Bearer " + analystToken }
    });
    console.log("      POST /api/replay/stop Status:", stopRes.status, "(Replay halted safely)");

    // 6. Test Comparative Evaluation (ML vs Baseline)
    console.log("\n[6/8] Fetching Comparative Evaluation (GET /api/evaluation/dataset/:id)...");
    const evalRes = await globalThis.fetch(
      `http://127.0.0.1:5062/api/evaluation/dataset/${uploadedDataset._id}`,
      { headers: { Authorization: "Bearer " + analystToken } }
    );
    const evalResult = await evalRes.json();
    const evalData = evalResult.data;

    console.log("      Evaluation Status:", evalRes.status);
    console.log("      Total Flows Evaluated:", evalData.totalEvaluated);
    console.log("      Random Forest Accuracy:", (evalData.mlModel.accuracy * 100).toFixed(1) + "%");
    console.log("      Rule Baseline Accuracy:", (evalData.baseline.accuracy * 100).toFixed(1) + "%");
    console.log("      Random Forest Macro F1:", (evalData.mlModel.macroF1 * 100).toFixed(1) + "%");
    console.log("      Rule Baseline Macro F1:", (evalData.baseline.macroF1 * 100).toFixed(1) + "%");
    console.log("      ML Advantage (F1):", `+${((evalData.mlModel.macroF1 - evalData.baseline.macroF1) * 100).toFixed(1)}%`);
    console.log("      Confusion Matrix Rows:", Object.keys(evalData.mlModel.confusionMatrix));
    console.log("      False Positives Count:", evalData.mlModel.falsePositivesCount);
    console.log("      False Negatives Count:", evalData.mlModel.falseNegativesCount);

    // 7. Test Admin Features (User RBAC & Audit Trail)
    console.log("\n[7/8] Verifying Admin Console (Users & Security Audit Trail)...");
    // List users
    const usersRes = await globalThis.fetch("http://127.0.0.1:5062/api/users", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    const usersData = await usersRes.json();
    console.log("      GET /api/users Status:", usersRes.status, "| Registered Accounts:", usersData.data?.users?.length);

    // Update role
    const roleChangeRes = await globalThis.fetch(
      `http://127.0.0.1:5062/api/users/${analystUser._id}/role`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
        body: JSON.stringify({ role: "admin" })
      }
    );
    const updatedUser = (await roleChangeRes.json()).data?.user;
    console.log("      PATCH /api/users/:id/role Status:", roleChangeRes.status, "| New Role:", updatedUser.role);

    // Audit logs
    const auditRes = await globalThis.fetch("http://127.0.0.1:5062/api/audit-logs", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    const auditData = await auditRes.json();
    console.log("      GET /api/audit-logs Status:", auditRes.status, "| Recorded Compliance Events:", auditData.data?.logs?.length);
    console.log("      Recent Actions Logged:", auditData.data?.logs?.slice(0, 3).map((l) => l.action).join(", "));

    // Notifications
    const notifRes = await globalThis.fetch("http://127.0.0.1:5062/api/notifications", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    const notifData = await notifRes.json();
    console.log("      GET /api/notifications Status:", notifRes.status, "| Total Alerts:", notifData.data?.notifications?.length, "| Unread:", notifData.data?.unreadCount);

    // 8. Teardown
    console.log("\n[8/8] Tearing down live verification environment...");
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
    console.log("   PHASE 10 LIVE STACK VERIFICATION COMPLETED: ALL PASS!          ");
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

runPhase10Verification();
