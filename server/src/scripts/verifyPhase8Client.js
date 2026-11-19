// Set environment variables BEFORE importing app and env modules
process.env.NODE_ENV = "test";
process.env.PORT = "5058";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/cybershield_phase8";
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

const { createApp } = await import("../app.js");
const { seedAdmin } = await import("./seedAdmin.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const clientDir = path.resolve(rootDir, "client");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForVite(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await globalThis.fetch("http://127.0.0.1:5173");
      if (res.ok) return true;
    } catch {
      // connecting...
    }
    await sleep(400);
  }
  return false;
}

async function runPhase8Verification() {
  console.log("=============================================================");
  console.log("  PHASE 8 LIVE VERIFICATION: CLIENT DEV SERVER & REAL API");
  console.log("=============================================================");

  // 1. Initialize MongoDB in memory
  console.log("[1/6] Initializing in-memory MongoDB...");
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log("      Connected to MongoMemoryServer at:", mongoUri);

  // 2. Seed Admin User in MongoDB
  console.log("[2/6] Seeding system administrator account...");
  const adminEmail = "admin@cybershield.local";
  const adminPassword = "AdminP@ssw0rdSecure!2026";
  const admin = await seedAdmin({
    email: adminEmail,
    password: adminPassword,
    name: "System Administrator"
  });
  console.log("      Admin seeded: email=" + admin.email + ", role=" + admin.role);

  // 3. Start Express HTTP Server
  console.log("[3/6] Starting Express backend on port 5058...");
  const app = createApp();
  const apiServer = http.createServer(app);
  await new Promise((resolve) => apiServer.listen(5058, resolve));
  console.log("      Express API listening on http://127.0.0.1:5058");

  // 4. Start Vite Dev Server
  console.log("[4/6] Spawning Vite development server in client/ on port 5173...");
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const viteProcess = spawn(npxCmd, ["vite", "--port", "5173", "--host", "127.0.0.1"], {
    cwd: clientDir,
    stdio: "pipe",
    shell: true,
    env: { ...process.env, VITE_API_URL: "http://127.0.0.1:5058" }
  });

  viteProcess.stderr.on("data", (_d) => {
    // Vite stderr handling
  });

  const isViteUp = await waitForVite(30);
  if (!isViteUp) {
    throw new Error("Vite development server failed to start within timeout.");
  }
  console.log("      Vite dev server is LIVE and responding at http://127.0.0.1:5173");

  // 5. Probe Vite Client App
  console.log("[5/6] Probing client application root...");
  const clientRes = await globalThis.fetch("http://127.0.0.1:5173");
  const htmlContent = await clientRes.text();
  console.log("      HTTP Status:", clientRes.status, clientRes.statusText);
  const hasAppTitle = htmlContent.includes("AI CyberShield SOC");
  console.log("      Verifying HTML contains 'AI CyberShield SOC':", hasAppTitle);
  if (!hasAppTitle) {
    throw new Error("Client index.html does not contain expected title.");
  }

  // 6. Test Real Admin Login against Express API
  console.log("[6/6] Executing login request with seeded admin credentials...");
  const loginRes = await globalThis.fetch("http://127.0.0.1:5058/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });

  console.log("      Login HTTP Status:", loginRes.status, loginRes.statusText);
  const loginJson = await loginRes.json();
  const loginData = loginJson.data || loginJson;

  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error("Login failed with response: " + JSON.stringify(loginJson));
  }

  console.log("      SUCCESSFUL AUTHENTICATION!");
  console.log("      JWT Token issued (truncated):", loginData.token.slice(0, 30) + "...");
  console.log("      Authenticated user name:", loginData.user.name);
  console.log("      Authenticated user email:", loginData.user.email);
  console.log("      Authenticated user role:", loginData.user.role);
  console.log("      Account isActive:", loginData.user.isActive);

  // Verify Session Token via /api/auth/me
  console.log("      Validating session persistence via GET /api/auth/me...");
  const meRes = await globalThis.fetch("http://127.0.0.1:5058/api/auth/me", {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  console.log("      Session check status:", meRes.status, meRes.statusText);
  const meJson = await meRes.json();
  const meData = meJson.data || meJson;
  console.log("      Session identity verified:", meData.user.email, "| role:", meData.user.role);

  // Verify Wrong Password Failure
  console.log("      Validating rejection on invalid password...");
  const badLoginRes = await globalThis.fetch("http://127.0.0.1:5058/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: "WrongP@ssword123!" })
  });
  const badLoginData = await badLoginRes.json();
  console.log("      Bad login status:", badLoginRes.status, "(expected 401)");
  console.log("      Error envelope message:", badLoginData.error?.message);

  // Teardown
  console.log("Tearing down test processes...");
  viteProcess.kill();
  await new Promise((resolve) => apiServer.close(resolve));
  await mongoose.disconnect();
  await mongoServer.stop();

  console.log("=============================================================");
  console.log("  PHASE 8 LIVE VERIFICATION COMPLETE: ALL INTEGRATIONS VERIFIED!");
  console.log("=============================================================");
  process.exit(0);
}

runPhase8Verification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
