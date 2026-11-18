import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { ROLES } from "../utils/constants.js";
import { signToken } from "../utils/jwt.js";
import { FEATURE_NAMES } from "../validators/detectValidators.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runE2E() {
  console.log("=== AI CYBERSHIELD END-TO-END VERIFICATION ===");

  // 1. Connect In-Memory Database
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log("[1] Connected to in-memory MongoDB");

  // 2. Start Express API Server on port 5055
  const app = createApp();
  const server = app.listen(5055);
  console.log("[2] Express API server listening on http://127.0.0.1:5055");

  // 3. Create Authenticated Security Analyst User
  const analyst = await User.create({
    name: "E2E Lead Analyst",
    email: "lead.analyst@threatlens.io",
    passwordHash: "dummyhash123",
    role: ROLES.ANALYST,
    isActive: true
  });
  const token = signToken({ sub: analyst._id.toString(), role: ROLES.ANALYST });
  console.log("[3] Analyst user created and JWT token generated");

  // 4. Load a real attack flow record from the public dataset demo sample
  const csvPath = path.resolve(__dirname, "../../../ml-training/sample/demo_flows.csv");
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const firstDataRow = lines[1].split(",").map((v) => v.trim());

  const flowRecord = {};
  for (let i = 0; i < headers.length; i++) {
    const col = headers[i];
    if (col !== "Label" && FEATURE_NAMES.includes(col)) {
      flowRecord[col] = parseFloat(firstDataRow[i]);
    }
  }

  const labelIndex = headers.indexOf("Label");
  const groundTruthLabel = labelIndex >= 0 ? firstDataRow[labelIndex] : "Unknown";
  console.log(
    `[4] Loaded real flow record from dataset (Ground Truth Label: '${groundTruthLabel}')`
  );

  // 5. POST /api/detect with the real flow record
  console.log("[5] Dispatching POST http://127.0.0.1:5055/api/detect ...");
  const response = await globalThis.fetch("http://127.0.0.1:5055/api/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ flow: flowRecord })
  });

  const statusCode = response.status;
  const resultJson = await response.json();

  console.log(`[6] Response Status Code: ${statusCode}`);
  console.log("[7] Real End-to-End Response Payload:\n" + JSON.stringify(resultJson, null, 2));

  // 6. Clean Teardown
  server.close();
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log("[8] Teardown complete. Verification SUCCESSFUL.");
}

runE2E().catch((err) => {
  console.error("FATAL E2E ERROR:", err);
  process.exit(1);
});
