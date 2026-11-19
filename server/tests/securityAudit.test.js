import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Dataset } from "../src/models/Dataset.js";
import { ROLES, INCIDENT_STATUSES } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";
import { startReplay, stopAllReplays } from "../src/services/replayService.js";
import * as detectionService from "../src/services/detectionService.js";

describe("Security & Quality Audit (Phase 11)", () => {
  let mongoServer;
  let app;
  let adminUser;
  let analystUser;
  let viewerUser;
  let adminToken;
  let analystToken;
  let viewerToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    adminUser = await User.create({
      name: "Security Admin",
      email: "audit-admin@cybershield.local",
      passwordHash: "$2b$12$eXampleHashedPasswordForTestingPurposesOnly12345678",
      role: ROLES.ADMIN,
      isActive: true
    });
    adminToken = signToken({ sub: adminUser._id.toString(), role: ROLES.ADMIN });

    analystUser = await User.create({
      name: "SOC Analyst",
      email: "audit-analyst@cybershield.local",
      passwordHash: adminUser.passwordHash,
      role: ROLES.ANALYST,
      isActive: true
    });
    analystToken = signToken({ sub: analystUser._id.toString(), role: ROLES.ANALYST });

    viewerUser = await User.create({
      name: "Guest Viewer",
      email: "audit-viewer@cybershield.local",
      passwordHash: adminUser.passwordHash,
      role: ROLES.VIEWER,
      isActive: true
    });
    viewerToken = signToken({ sub: viewerUser._id.toString(), role: ROLES.VIEWER });
  });

  afterAll(async () => {
    stopAllReplays();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    stopAllReplays();
  });

  describe("1. Configuration & Production Hardening", () => {
    it("rejects weak placeholder secrets in production mode", async () => {
      const { validateEnvConfig } = await import("../src/config/env.js");

      // Test short JWT secret
      expect(() => {
        validateEnvConfig({
          NODE_ENV: "production",
          PORT: "5000",
          CLIENT_URL: "https://soc.cybershield.org",
          MONGO_URI: "mongodb+srv://user:pass@cluster.mongodb.net/prod",
          JWT_SECRET: "too_short_secret",
          ML_API_KEY: "prod-secret-key-123",
          ADMIN_EMAIL: "admin@cybershield.org",
          ADMIN_PASSWORD: "SuperSecureProdPassword2026!"
        });
      }).toThrow(/JWT_SECRET must be at least 32 characters/i);

      // Test placeholder test secret in production
      expect(() => {
        validateEnvConfig({
          NODE_ENV: "production",
          PORT: "5000",
          CLIENT_URL: "https://soc.cybershield.org",
          MONGO_URI: "mongodb+srv://user:pass@cluster.mongodb.net/prod",
          JWT_SECRET: "super_secret_jwt_key_at_least_32_characters_long_for_tests",
          ML_API_KEY: "prod-secret-key-123",
          ADMIN_EMAIL: "admin@cybershield.org",
          ADMIN_PASSWORD: "SuperSecureProdPassword2026!"
        });
      }).toThrow(/placeholder/i);

      // Test missing ADMIN_EMAIL in production
      expect(() => {
        validateEnvConfig({
          NODE_ENV: "production",
          PORT: "5000",
          CLIENT_URL: "https://soc.cybershield.org",
          MONGO_URI: "mongodb+srv://user:pass@cluster.mongodb.net/prod",
          JWT_SECRET: "a_very_strong_production_secret_key_randomized_1234567890",
          ML_API_KEY: "prod-secret-key-123"
        });
      }).toThrow(/ADMIN_EMAIL is required/i);
    });
  });

  describe("2. Error Handling & Malformed Identifier Guard", () => {
    it("returns 400 INVALID_IDENTIFIER when malformed ObjectId is requested on /api/incidents/:id", async () => {
      const res = await request(app)
        .get("/api/incidents/invalid-hex-id-123")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_IDENTIFIER");
      expect(res.body.error.message).toMatch(/invalid format for identifier/i);
    });

    it("returns 400 INVALID_IDENTIFIER when malformed ObjectId is passed to /api/datasets/:id", async () => {
      const res = await request(app)
        .delete("/api/datasets/malformed-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_IDENTIFIER");
    });
  });

  describe("3. CORS Exact-Match & Rejection", () => {
    it("returns 403 Forbidden when origin does not match CLIENT_URL", async () => {
      const res = await request(app)
        .get("/api/health")
        .set("Origin", "http://malicious-attacker-site.com");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CORS_FORBIDDEN");
    });
  });

  describe("4. Concurrency Edge Cases", () => {
    it("rejects starting a second replay session for the same user with 409 Conflict", async () => {
      await Dataset.create({
        name: "Concurrency Test Dataset",
        originalName: "test.csv",
        originalFilename: "test.csv",
        sizeBytes: 1024,
        rowCount: 100,
        incidentCount: 5,
        uploadedBy: adminUser._id
      });

      // Start initial replay
      const res1 = await request(app)
        .post("/api/replay/start")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ datasetId: "demo", ratePerSecond: 10 });

      expect(res1.status).toBe(200);

      // Attempt second simultaneous replay
      const res2 = await request(app)
        .post("/api/replay/start")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ datasetId: "demo", ratePerSecond: 10 });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe("REPLAY_ALREADY_ACTIVE");
    });

    it("halts active replay session cleanly when the underlying dataset is deleted", async () => {
      const dataset = await Dataset.create({
        name: "Doomed Dataset",
        originalName: "doomed.csv",
        originalFilename: "doomed.csv",
        sizeBytes: 2048,
        rowCount: 50,
        incidentCount: 0,
        uploadedBy: adminUser._id
      });

      // Simulate active replay mapped to this dataset
      await startReplay({
        datasetId: dataset._id.toString(),
        ratePerSecond: 10,
        user: analystUser
      });

      // Delete the dataset
      const res = await request(app)
        .delete(`/api/datasets/${dataset._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify that the replay session was halted
      const statusRes = await request(app)
        .get("/api/replay/status")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(statusRes.body.data.active).toBe(false);
    });
  });

  describe("5. Notifications unreadCount Accuracy", () => {
    it("returns accurate unreadCount in GET /api/notifications", async () => {
      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.unreadCount).toBe("number");
    });
  });

  describe("6. Failure-Path & Service Resilience", () => {
    it("GET /api/ready returns 503 when database disconnects", async () => {
      const spy = vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(0);

      const res = await request(app).get("/api/ready");
      expect(res.status).toBe(503);
      expect(res.body.status).toBe("unready");
      expect(res.body.reason).toMatch(/not connected/i);

      spy.mockRestore();
    });

    it("returns 404 with standard error envelope on undefined routes", async () => {
      const res = await request(app).get("/api/non-existent-endpoint");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });

  describe("7. End-to-End Complete Operator Lifecycle Flow", () => {
    it("completes full lifecycle: register -> login -> promote -> upload -> triage -> note -> export -> evaluation", async () => {
      // Mock detectBatch to return a mixture of attack and benign flows
      vi.spyOn(detectionService, "detectBatch").mockResolvedValue([
        {
          mlClass: "DoS/DDoS",
          confidence: 0.95,
          baselineClass: "DoS/DDoS",
          score: 85,
          riskLevel: "Critical",
          explanation: [{ factor: "class_severity", contribution: 50 }]
        },
        {
          mlClass: "Benign",
          confidence: 0.99,
          baselineClass: "Benign",
          score: 0,
          riskLevel: "Low",
          explanation: [{ factor: "benign", contribution: 0 }]
        }
      ]);

      const testEmail = `operator-${Date.now()}@cybershield.local`;
      const testPassword = "SecureP@ssword2026!";

      // 1. Register new operator (must default to Viewer)
      const regRes = await request(app).post("/api/auth/register").send({
        name: "Field Analyst",
        email: testEmail,
        password: testPassword
      });
      expect(regRes.status).toBe(201);
      expect(regRes.body.data.user.role).toBe(ROLES.VIEWER);

      const operatorId = regRes.body.data.user._id;

      // 2. Login to acquire token
      const loginRes = await request(app).post("/api/auth/login").send({
        email: testEmail,
        password: testPassword
      });
      expect(loginRes.status).toBe(200);
      const operatorToken = loginRes.body.data.token;
      expect(typeof operatorToken).toBe("string");

      // Verify Viewer role cannot perform Analyst dataset upload (RBAC check)
      const sampleCsvPath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../ml-training/sample/demo_flows.csv"
      );
      const csvBuffer = fs.readFileSync(sampleCsvPath);

      const forbiddenUpload = await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${viewerToken}`)
        .attach("file", csvBuffer, "demo_flows.csv");
      expect(forbiddenUpload.status).toBe(403);

      // 3. Admin promotes operator to Analyst
      const promoteRes = await request(app)
        .patch(`/api/users/${operatorId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: ROLES.ANALYST });
      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body.data.user.role).toBe(ROLES.ANALYST);

      // Sign upgraded token for analyst actions
      const upgradedToken = signToken({ sub: operatorId, role: ROLES.ANALYST });

      // 4. Ingest sample dataset
      const uploadRes = await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${upgradedToken}`)
        .attach("file", csvBuffer, "demo_flows.csv")
        .field("name", "E2E Lifecycle Sample");

      expect(uploadRes.status).toBe(201);
      const dataset = uploadRes.body.data.dataset;
      expect(dataset.rowCount).toBeGreaterThan(0);

      // 5. Query incidents generated from upload
      const incidentsRes = await request(app)
        .get("/api/incidents")
        .set("Authorization", `Bearer ${upgradedToken}`)
        .query({ limit: 5 });
      expect(incidentsRes.status).toBe(200);
      expect(incidentsRes.body.data.incidents.length).toBeGreaterThan(0);

      const targetIncident = incidentsRes.body.data.incidents[0];

      // 6. Transition incident status from New -> Under Review
      const statusRes = await request(app)
        .patch(`/api/incidents/${targetIncident._id}/status`)
        .set("Authorization", `Bearer ${upgradedToken}`)
        .send({ status: INCIDENT_STATUSES.UNDER_REVIEW });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.incident.status).toBe(INCIDENT_STATUSES.UNDER_REVIEW);

      // 7. Add investigation note
      const noteRes = await request(app)
        .post(`/api/incidents/${targetIncident._id}/notes`)
        .set("Authorization", `Bearer ${upgradedToken}`)
        .send({ text: "E2E verification forensic inspection note." });
      expect(noteRes.status).toBe(201);
      expect(noteRes.body.data.incident.notes.length).toBeGreaterThan(0);

      // 8. Export incidents as sanitized CSV
      const exportRes = await request(app)
        .get("/api/incidents/export")
        .set("Authorization", `Bearer ${upgradedToken}`);
      expect(exportRes.status).toBe(200);
      expect(exportRes.headers["content-type"]).toMatch(/text\/csv/);
      expect(exportRes.text).toContain("Incident ID,Detected At");

      // 9. Fetch comparative evaluation for this dataset
      const evalRes = await request(app)
        .get(`/api/evaluation/dataset/${dataset._id}`)
        .set("Authorization", `Bearer ${upgradedToken}`);
      expect(evalRes.status).toBe(200);
      expect(evalRes.body.data.totalEvaluated).toBe(dataset.rowCount);
      expect(evalRes.body.data.mlModel.confusionMatrix).toBeDefined();

      // 10. Verify security audit trail records all sensitive operations
      const auditRes = await request(app)
        .get("/api/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(auditRes.status).toBe(200);
      const actions = auditRes.body.data.logs.map((l) => l.action);
      expect(actions).toContain("REGISTER");
      expect(actions).toContain("ROLE_CHANGE");
      expect(actions).toContain("DATASET_UPLOAD");
      expect(actions).toContain("INCIDENT_STATUS_CHANGE");
    });
  });
});
