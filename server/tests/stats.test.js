import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Incident } from "../src/models/Incident.js";
import { Dataset } from "../src/models/Dataset.js";
import { ROLES, ATTACK_CLASSES, RISK_LEVELS, INCIDENT_STATUSES } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";

describe("SOC Analytics & Aggregation Pipelines (Phase 7)", () => {
  let mongoServer;
  let app;
  let adminUser;
  let viewerUser;
  let adminToken;
  let viewerToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    adminUser = await User.create({
      name: "Stats Admin",
      email: "stats.admin@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ADMIN,
      isActive: true
    });
    adminToken = signToken({ sub: adminUser._id.toString(), role: ROLES.ADMIN });

    viewerUser = await User.create({
      name: "Stats Viewer",
      email: "stats.viewer@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.VIEWER,
      isActive: true
    });
    viewerToken = signToken({ sub: viewerUser._id.toString(), role: ROLES.VIEWER });

    // Seed Dataset with 100 rows (60 Benign, 40 incidents)
    await Dataset.create({
      name: "Test Aggregate Dataset",
      originalFilename: "test.csv",
      sizeBytes: 5000,
      rowCount: 100,
      benignCount: 60,
      incidentCount: 40,
      status: "completed",
      uploadedBy: adminUser._id
    });

    // Seed 4 Incidents: 2 DoS/DDoS (Critical, High), 1 PortScan (Medium), 1 BruteForce (High)
    await Incident.create([
      {
        detectedAt: new Date("2026-11-18T10:15:00Z"),
        source: "192.168.1.100",
        destination: "10.0.0.1",
        protocol: "TCP",
        mlClass: ATTACK_CLASSES.DOS_DDOS,
        confidence: 0.95,
        baselineClass: ATTACK_CLASSES.DOS_DDOS,
        score: 95,
        riskLevel: RISK_LEVELS.CRITICAL,
        status: INCIDENT_STATUSES.NEW,
        createdBy: adminUser._id
      },
      {
        detectedAt: new Date("2026-11-18T10:45:00Z"),
        source: "192.168.1.100",
        destination: "10.0.0.2",
        protocol: "UDP",
        mlClass: ATTACK_CLASSES.DOS_DDOS,
        confidence: 0.85,
        baselineClass: ATTACK_CLASSES.DOS_DDOS,
        score: 75,
        riskLevel: RISK_LEVELS.HIGH,
        status: INCIDENT_STATUSES.UNDER_REVIEW,
        createdBy: adminUser._id
      },
      {
        detectedAt: new Date("2026-11-18T11:20:00Z"),
        source: "192.168.1.105",
        destination: "10.0.0.1",
        protocol: "TCP",
        mlClass: ATTACK_CLASSES.PORTSCAN,
        confidence: 0.7,
        baselineClass: ATTACK_CLASSES.PORTSCAN,
        score: 45,
        riskLevel: RISK_LEVELS.MEDIUM,
        status: INCIDENT_STATUSES.RESOLVED,
        createdBy: adminUser._id
      },
      {
        detectedAt: new Date("2026-11-18T12:05:00Z"),
        source: "192.168.1.200",
        destination: "10.0.0.5",
        protocol: "TCP",
        mlClass: ATTACK_CLASSES.BRUTEFORCE,
        confidence: 0.8,
        baselineClass: ATTACK_CLASSES.BRUTEFORCE,
        score: 70,
        riskLevel: RISK_LEVELS.HIGH,
        status: INCIDENT_STATUSES.NEW,
        createdBy: adminUser._id
      }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("GET /api/stats/summary returns aggregate telemetry totals and attack ratio", async () => {
    const res = await request(app)
      .get("/api/stats/summary")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    const summary = res.body.data;

    expect(summary.totalEvents).toBe(100);
    expect(summary.attackCount).toBe(4);
    expect(summary.criticalCount).toBe(1);
    expect(summary.highCriticalCount).toBe(3); // 1 Critical + 2 High
    expect(summary.activeIncidents).toBe(3); // 2 New + 1 Under Review
    expect(summary.attackRatio).toBe(0.04); // 4 / 100
  });

  it("GET /api/stats/timeline groups incidents into time buckets with class breakdown", async () => {
    const res = await request(app)
      .get("/api/stats/timeline?interval=hour")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    const timeline = res.body.data.timeline;

    expect(timeline.length).toBe(3); // 10:00, 11:00, 12:00 buckets
    expect(timeline[0].timestamp).toContain("10:00");
    expect(timeline[0].total).toBe(2);
    expect(timeline[0].critical).toBe(1);
    expect(timeline[0].byClass["DoS/DDoS"]).toBe(2);
  });

  it("GET /api/stats/distribution aggregates counts across class, risk level, status and protocol", async () => {
    const res = await request(app)
      .get("/api/stats/distribution")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    const dist = res.body.data;

    expect(dist.byClass["DoS/DDoS"]).toBe(2);
    expect(dist.byClass.PortScan).toBe(1);
    expect(dist.byClass.BruteForce).toBe(1);

    expect(dist.byRiskLevel.Critical).toBe(1);
    expect(dist.byRiskLevel.High).toBe(2);
    expect(dist.byRiskLevel.Medium).toBe(1);

    expect(dist.byStatus.New).toBe(2);
    expect(dist.byStatus["Under Review"]).toBe(1);
    expect(dist.byStatus.Resolved).toBe(1);

    expect(dist.byProtocol.TCP).toBe(3);
    expect(dist.byProtocol.UDP).toBe(1);
  });

  it("GET /api/stats/top-sources masks IP addresses for Viewer role and reveals for Admin", async () => {
    const viewerRes = await request(app)
      .get("/api/stats/top-sources?limit=5")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(viewerRes.status).toBe(200);
    const viewerSources = viewerRes.body.data.sources;
    expect(viewerSources[0].source).toBe("192.168.1.xxx");
    expect(viewerSources[0].incidentCount).toBe(2);

    const adminRes = await request(app)
      .get("/api/stats/top-sources?limit=5")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    const adminSources = adminRes.body.data.sources;
    expect(adminSources[0].source).toBe("192.168.1.100");
    expect(adminSources[0].incidentCount).toBe(2);
    expect(adminSources[0].avgScore).toBe(85); // (95 + 75) / 2
  });
});
