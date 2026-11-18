// Set environment variables BEFORE importing app and env modules
process.env.NODE_ENV = "test";
process.env.PORT = "5057";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/cybershield_phase7";
process.env.JWT_SECRET = "super_secret_jwt_key_at_least_32_characters_long_for_tests";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ML_SERVICE_URL = "http://127.0.0.1:7860";
process.env.ML_API_KEY = "default_insecure_key_change_in_production";
process.env.LOG_LEVEL = "silent";

import http from "node:http";
import path from "node:path";
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
      // waiting for start
    }
    await sleep(500);
  }
  throw new Error("ML service failed to start within timeout");
}

async function runPhase7Verification() {
  console.log("=================================================================");
  console.log("   AI CYBERSHIELD - PHASE 7 REALTIME REPLAY & TELEMETRY CHECK   ");
  console.log("=================================================================\n");

  const { createApp } = await import("../app.js");
  const { initSocketServer } = await import("../sockets/socketManager.js");
  const { User } = await import("../models/User.js");
  const { ROLES } = await import("../utils/constants.js");
  const { signToken } = await import("../utils/jwt.js");

  // 1. Start ML Microservice locally
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

  mlProcess.stderr.on("data", (_data) => {});

  try {
    await waitForMlService();
    console.log("    -> ML Service is HEALTHY on http://127.0.0.1:7860\n");

    // 2. Start MongoMemoryServer & HTTP Server with Socket.IO
    console.log("[2] Starting In-Memory MongoDB & HTTP Server with Socket.IO...");
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const app = createApp();
    const server = http.createServer(app);
    const io = initSocketServer(server, "http://localhost:5173");
    app.set("io", io);

    const baseUrl = "http://127.0.0.1:5057";
    await new Promise((resolve) => server.listen(5057, resolve));
    console.log(`    -> HTTP & Socket.IO server online at ${baseUrl}\n`);

    // 3. Create Analyst and Admin users
    console.log("[3] Creating Analyst and Admin accounts...");
    const analyst = await User.create({
      name: "SOC Lead Analyst",
      email: "soc.analyst@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ANALYST,
      isActive: true
    });
    const analystToken = signToken({ sub: analyst._id.toString(), role: ROLES.ANALYST });
    console.log("    -> Analyst JWT generated\n");

    // 4. Connect Authenticated Socket.IO Client
    console.log("[4] Connecting Authenticated Socket.IO Client...");
    const socketClient = Client(baseUrl, {
      auth: { token: analystToken },
      transports: ["websocket"]
    });

    const receivedIncidents = [];
    const receivedProgress = [];
    const receivedNotifications = [];

    await new Promise((resolve, reject) => {
      socketClient.on("connect", () => {
        console.log(`    -> Connected to Socket.IO room with socket ID: ${socketClient.id}`);
        resolve();
      });
      socketClient.on("connect_error", reject);
    });

    socketClient.on("incident:new", (inc) => {
      receivedIncidents.push(inc);
    });

    socketClient.on("replay:progress", (prog) => {
      receivedProgress.push(prog);
    });

    socketClient.on("notification:new", (notif) => {
      receivedNotifications.push(notif);
    });

    // 5. Start Replay via POST /api/replay/start
    console.log("\n[5] Dispatching POST /api/replay/start (datasetId: 'demo', rate: 25)...");
    const startRes = await globalThis.fetch(`${baseUrl}/api/replay/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${analystToken}`
      },
      body: JSON.stringify({ datasetId: "demo", ratePerSecond: 25 })
    });
    const startJson = await startRes.json();
    console.log("    -> Start Replay Response:\n", JSON.stringify(startJson, null, 2));

    // 6. Let replay stream for 1.5 seconds and collect live events
    console.log("\n[6] Streaming live network flow telemetry for 1.5 seconds...");
    await sleep(1500);

    // 7. Check Replay Status
    const statusRes = await globalThis.fetch(`${baseUrl}/api/replay/status`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const statusJson = await statusRes.json();
    console.log("    -> Live Replay Status:\n", JSON.stringify(statusJson, null, 2));

    // 8. Stop Replay
    console.log("\n[8] Stopping replay via POST /api/replay/stop...");
    const stopRes = await globalThis.fetch(`${baseUrl}/api/replay/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const stopJson = await stopRes.json();
    console.log("    -> Stop Response:\n", JSON.stringify(stopJson, null, 2));

    // 9. Inspect Socket.IO Events Received
    console.log("\n[9] Socket.IO Events Received during Replay:");
    console.log(`    -> 'incident:new' events: ${receivedIncidents.length}`);
    if (receivedIncidents.length > 0) {
      console.log("    -> Sample First Replayed Incident (Masked IP for Analyst):");
      console.log(
        JSON.stringify(
          {
            id: receivedIncidents[0]._id,
            class: receivedIncidents[0].mlClass,
            confidence: receivedIncidents[0].confidence,
            score: receivedIncidents[0].score,
            riskLevel: receivedIncidents[0].riskLevel,
            source: receivedIncidents[0].source,
            destination: receivedIncidents[0].destination
          },
          null,
          2
        )
      );
    }
    console.log(`    -> 'replay:progress' events: ${receivedProgress.length}`);
    console.log(`    -> 'notification:new' alerts: ${receivedNotifications.length}`);

    // 10. Query Stats Summary
    console.log("\n[10] Querying GET /api/stats/summary...");
    const statsSummaryRes = await globalThis.fetch(`${baseUrl}/api/stats/summary`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const statsSummaryJson = await statsSummaryRes.json();
    console.log("    -> Stats Summary:\n", JSON.stringify(statsSummaryJson.data, null, 2));

    // 11. Query Stats Distribution
    console.log("\n[11] Querying GET /api/stats/distribution...");
    const statsDistRes = await globalThis.fetch(`${baseUrl}/api/stats/distribution`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const statsDistJson = await statsDistRes.json();
    console.log("    -> Stats Distribution:\n", JSON.stringify(statsDistJson.data, null, 2));

    // 12. Query Top Sources
    console.log("\n[12] Querying GET /api/stats/top-sources...");
    const topSourcesRes = await globalThis.fetch(`${baseUrl}/api/stats/top-sources?limit=3`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const topSourcesJson = await topSourcesRes.json();
    console.log(
      "    -> Top Sources (Masked):\n",
      JSON.stringify(topSourcesJson.data.sources, null, 2)
    );

    // 13. Query Evaluation
    console.log("\n[13] Querying GET /api/evaluation/latest...");
    const evalLatestRes = await globalThis.fetch(`${baseUrl}/api/evaluation/latest`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const evalLatestJson = await evalLatestRes.json();
    console.log(
      "    -> ML Model Info & Baseline Reference:\n",
      JSON.stringify(
        {
          mlAlgorithm: evalLatestJson.data?.mlModel?.algorithm,
          featureCount: evalLatestJson.data?.mlModel?.featureCount,
          baselineAlgorithm: evalLatestJson.data?.baseline?.algorithm,
          baselineAccuracy: evalLatestJson.data?.baseline?.accuracy,
          baselineMacroF1: evalLatestJson.data?.baseline?.macroF1
        },
        null,
        2
      )
    );

    console.log("\n[14] Querying GET /api/evaluation/dataset/demo...");
    const evalDatasetRes = await globalThis.fetch(`${baseUrl}/api/evaluation/dataset/demo`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const evalDatasetJson = await evalDatasetRes.json();
    console.log(
      "    -> Comparative Evaluation (ML vs Baseline):\n",
      JSON.stringify(
        {
          totalEvaluated: evalDatasetJson.data?.totalEvaluated,
          mlAccuracy: evalDatasetJson.data?.mlModel?.accuracy,
          mlMacroF1: evalDatasetJson.data?.mlModel?.macroF1,
          baselineAccuracy: evalDatasetJson.data?.baseline?.accuracy,
          baselineMacroF1: evalDatasetJson.data?.baseline?.macroF1,
          discrepancyCount: evalDatasetJson.data?.discrepancyCount
        },
        null,
        2
      )
    );

    // 15. Notifications Query
    console.log("\n[15] Querying GET /api/notifications...");
    const notifRes = await globalThis.fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const notifJson = await notifRes.json();
    console.log(`    -> Total In-App Notifications: ${notifJson.data?.pagination?.total}`);

    // Teardown
    console.log("\n[16] Cleaning up test infrastructure...");
    socketClient.close();
    io.close();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log("    -> Express, Socket.IO and MongoDB stopped.");

    console.log("\n=================================================================");
    console.log("   PHASE 7 REALTIME VERIFICATION COMPLETED SUCCESSFULLY!");
    console.log("=================================================================");
    process.exit(0);
  } finally {
    mlProcess.kill();
  }
}

runPhase7Verification().catch((err) => {
  console.error("\nFATAL PHASE 7 VERIFICATION ERROR:", err);
  process.exit(1);
});
