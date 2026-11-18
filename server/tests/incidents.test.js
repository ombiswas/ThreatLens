import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Incident } from "../src/models/Incident.js";
import { AuditLog } from "../src/models/AuditLog.js";
import {
  ROLES,
  AUDIT_ACTIONS,
  INCIDENT_STATUSES,
  RISK_LEVELS,
  ATTACK_CLASSES
} from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";
import { sanitizeCsvCell } from "../src/services/incidentService.js";

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Incident.deleteMany({});
  await AuditLog.deleteMany({});
});

describe("Incident Management & Triage (incidentService & incidentController)", () => {
  let adminUser;
  let analystUser;
  let viewerUser;
  let adminToken;
  let analystToken;
  let viewerToken;
  let testIncident;

  beforeEach(async () => {
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@threatlens.io",
      passwordHash: "hash",
      role: ROLES.ADMIN
    });

    analystUser = await User.create({
      name: "Analyst User",
      email: "analyst@threatlens.io",
      passwordHash: "hash",
      role: ROLES.ANALYST
    });

    viewerUser = await User.create({
      name: "Viewer User",
      email: "viewer@threatlens.io",
      passwordHash: "hash",
      role: ROLES.VIEWER
    });

    adminToken = signToken({ sub: adminUser._id.toString(), role: ROLES.ADMIN });
    analystToken = signToken({ sub: analystUser._id.toString(), role: ROLES.ANALYST });
    viewerToken = signToken({ sub: viewerUser._id.toString(), role: ROLES.VIEWER });

    testIncident = await Incident.create({
      detectedAt: new Date("2026-11-18T10:00:00Z"),
      source: "192.168.1.100",
      destination: "10.0.0.50",
      protocol: "TCP",
      mlClass: ATTACK_CLASSES.DOS_DDOS,
      confidence: 0.96,
      baselineClass: ATTACK_CLASSES.DOS_DDOS,
      score: 95,
      riskLevel: RISK_LEVELS.CRITICAL,
      explanation: [{ factor: "class", description: "DoS flood", contribution: 95 }],
      status: INCIDENT_STATUSES.NEW
    });

    await Incident.create({
      detectedAt: new Date("2026-11-18T11:00:00Z"),
      source: "172.16.0.45",
      destination: "10.0.0.80",
      protocol: "TCP",
      mlClass: ATTACK_CLASSES.PORTSCAN,
      confidence: 0.88,
      baselineClass: ATTACK_CLASSES.BENIGN,
      score: 65,
      riskLevel: RISK_LEVELS.HIGH,
      explanation: [{ factor: "class", description: "Port probe", contribution: 65 }],
      status: INCIDENT_STATUSES.UNDER_REVIEW
    });
  });

  describe("1. Query Pagination, Sorting & Filtering", () => {
    it("returns paginated incidents with correct total count", async () => {
      const res = await request(app)
        .get("/api/incidents?page=1&limit=1")
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.incidents.length).toBe(1);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.pagination.pages).toBe(2);
    });

    it("filters incidents strictly by riskLevel, mlClass, and status", async () => {
      // Filter by riskLevel: Critical
      const critRes = await request(app)
        .get("/api/incidents?riskLevel=Critical")
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(200);
      expect(critRes.body.data.incidents.length).toBe(1);
      expect(critRes.body.data.incidents[0].riskLevel).toBe("Critical");

      // Filter by status: Under Review
      const reviewRes = await request(app)
        .get("/api/incidents?status=Under%20Review")
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(200);
      expect(reviewRes.body.data.incidents.length).toBe(1);
      expect(reviewRes.body.data.incidents[0].status).toBe("Under Review");
    });

    it("rejects NoSQL injection attempts in query parameters", async () => {
      const res = await request(app)
        .get("/api/incidents?status[$ne]=null")
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("2. Role-Based IP Masking", () => {
    it("masks source and destination IP addresses for Viewer and Analyst roles", async () => {
      const viewerRes = await request(app)
        .get(`/api/incidents/${testIncident._id}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(200);

      expect(viewerRes.body.data.incident.source).toBe("192.168.1.xxx");
      expect(viewerRes.body.data.incident.destination).toBe("10.0.0.xxx");

      const analystRes = await request(app)
        .get(`/api/incidents/${testIncident._id}`)
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(200);

      expect(analystRes.body.data.incident.source).toBe("192.168.1.xxx");
      expect(analystRes.body.data.incident.destination).toBe("10.0.0.xxx");
    });

    it("provides unmasked exact IP addresses to Admin role", async () => {
      const adminRes = await request(app)
        .get(`/api/incidents/${testIncident._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(adminRes.body.data.incident.source).toBe("192.168.1.100");
      expect(adminRes.body.data.incident.destination).toBe("10.0.0.50");
    });
  });

  describe("3. Status Transitions & Triage", () => {
    it("permits valid status transition (New -> Under Review) and records audit log", async () => {
      const res = await request(app)
        .patch(`/api/incidents/${testIncident._id}/status`)
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ status: INCIDENT_STATUSES.UNDER_REVIEW })
        .expect(200);

      expect(res.body.data.incident.status).toBe(INCIDENT_STATUSES.UNDER_REVIEW);

      const audit = await AuditLog.findOne({
        action: AUDIT_ACTIONS.INCIDENT_STATUS_CHANGE,
        userId: analystUser._id
      });
      expect(audit).toBeDefined();
      expect(audit.details.newStatus).toBe(INCIDENT_STATUSES.UNDER_REVIEW);
    });

    it("rejects invalid status transitions with 422", async () => {
      // First resolve the incident
      testIncident.status = INCIDENT_STATUSES.RESOLVED;
      await testIncident.save();

      // Resolved -> New is an invalid transition
      const res = await request(app)
        .patch(`/api/incidents/${testIncident._id}/status`)
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ status: INCIDENT_STATUSES.NEW })
        .expect(422);

      expect(res.body.error.message).toContain("Invalid status transition");
    });

    it("rejects Viewer role from updating incident status", async () => {
      await request(app)
        .patch(`/api/incidents/${testIncident._id}/status`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ status: INCIDENT_STATUSES.UNDER_REVIEW })
        .expect(403);
    });
  });

  describe("4. Analytical Notes", () => {
    it("allows Analyst to add a note up to 1000 characters", async () => {
      const noteText = "Suspicious DoS pattern observed matching known volumetric flood vector.";

      const res = await request(app)
        .post(`/api/incidents/${testIncident._id}/notes`)
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ text: noteText })
        .expect(201);

      expect(res.body.data.incident.notes.length).toBe(1);
      expect(res.body.data.incident.notes[0].text).toBe(noteText);
      expect(res.body.data.incident.notes[0].authorName).toBe("Analyst User");
    });

    it("rejects notes exceeding 1000 characters", async () => {
      const oversizedText = "A".repeat(1001);

      const res = await request(app)
        .post(`/api/incidents/${testIncident._id}/notes`)
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ text: oversizedText })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("5. CSV Export & Formula Injection Sanitization", () => {
    it("neutralizes formula injection characters (=, +, -, @) by prepending a single quote", () => {
      expect(sanitizeCsvCell("=CMD('calc')")).toBe("'=CMD('calc')");
      expect(sanitizeCsvCell("+1+2")).toBe("'+1+2");
      expect(sanitizeCsvCell("-SUM(A1:A10)")).toBe("'-SUM(A1:A10)");
      expect(sanitizeCsvCell("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
      expect(sanitizeCsvCell("NormalText")).toBe("NormalText");
    });

    it("exports sanitized CSV with masked IPs for non-admin callers", async () => {
      const res = await request(app)
        .get("/api/incidents/export")
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(200);

      expect(res.headers["content-type"]).toContain("text/csv");
      const csv = res.text;
      expect(csv).toContain("Incident ID,Detected At,Source,Destination");
      // Analyst export has masked IPs
      expect(csv).toContain("192.168.1.xxx");
      expect(csv).not.toContain("192.168.1.100");

      const audit = await AuditLog.findOne({ action: AUDIT_ACTIONS.INCIDENT_EXPORT });
      expect(audit).toBeDefined();
    });
  });
});
