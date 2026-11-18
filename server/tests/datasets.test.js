import { Buffer } from "node:buffer";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Dataset } from "../src/models/Dataset.js";
import { Incident } from "../src/models/Incident.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { ROLES, AUDIT_ACTIONS } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";
import { FEATURE_NAMES } from "../src/validators/detectValidators.js";
import * as detectionService from "../src/services/detectionService.js";

let mongoServer;
let app;

// Generates a mock CSV string containing header and N rows
function generateMockCsv(rowCount = 2, extraColumns = [], overrideFirstRow = {}) {
  const headers = [...FEATURE_NAMES, "Label", ...extraColumns];
  const rows = [];

  for (let r = 0; r < rowCount; r++) {
    const values = headers.map((header) => {
      if (header === "Label") return r % 2 === 0 ? "DoS/DDoS" : "Benign";
      if (overrideFirstRow[header] !== undefined && r === 0) return overrideFirstRow[header];
      if (header === "Destination Port") return 80;
      return 10.0;
    });
    rows.push(values.join(","));
  }

  return [headers.join(","), ...rows].join("\n");
}

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
  await Dataset.deleteMany({});
  await Incident.deleteMany({});
  await AuditLog.deleteMany({});
  vi.restoreAllMocks();
});

describe("Dataset Upload & Ingestion (datasetService & datasetController)", () => {
  let adminUser;
  let analystUser;
  let viewerUser;
  let adminToken;
  let analystToken;
  let viewerToken;

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
  });

  describe("1. Upload Authorization & Validation Safeguards", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const csvData = generateMockCsv(2);
      await request(app)
        .post("/api/datasets/upload")
        .attach("file", Buffer.from(csvData), "test.csv")
        .field("name", "Test Dataset")
        .expect(401);
    });

    it("rejects Viewer role with 403 Forbidden", async () => {
      const csvData = generateMockCsv(2);
      await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${viewerToken}`)
        .attach("file", Buffer.from(csvData), "test.csv")
        .field("name", "Test Dataset")
        .expect(403);
    });

    it("rejects non-CSV files by extension and MIME type", async () => {
      const textData = "Not a CSV file";
      const res = await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${analystToken}`)
        .attach("file", Buffer.from(textData), "malicious_script.exe")
        .field("name", "Executable Attack")
        .expect(422);

      expect(res.body.error.message).toContain(".csv");
    });

    it("rejects binary executables disguised with .csv extension (content sniffing)", async () => {
      // Create buffer with DOS executable header "MZ"
      const mzExecutable = Buffer.concat([
        Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
        Buffer.from(",header1,header2\n")
      ]);

      const res = await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${analystToken}`)
        .attach("file", mzExecutable, { filename: "stealth.csv", contentType: "text/csv" })
        .field("name", "Disguised Binary")
        .expect(422);

      expect(res.body.error.message).toContain("Executable files are forbidden");
    });

    it("rejects CSV with missing required features in header", async () => {
      const incompleteCsv = "Destination Port,Flow Duration\n80,1000\n";

      const res = await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${analystToken}`)
        .attach("file", Buffer.from(incompleteCsv), "incomplete.csv")
        .field("name", "Incomplete Dataset")
        .expect(422);

      expect(res.body.error.message).toContain("is missing from CSV header");
    });

    it("rejects CSV with unknown extra columns outside whitelist", async () => {
      const badHeaderCsv = generateMockCsv(2, ["unauthorized_injection_col"]);

      const res = await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${analystToken}`)
        .attach("file", Buffer.from(badHeaderCsv), "bad_header.csv")
        .field("name", "Bad Header Dataset")
        .expect(422);

      expect(res.body.error.message).toContain("Unrecognized column");
    });
  });

  describe("2. Processing, Batching & Incident Creation", () => {
    it("processes dataset and creates incidents ONLY for non-Benign detections", async () => {
      vi.spyOn(detectionService, "detectBatch").mockResolvedValue([
        {
          mlClass: "DoS/DDoS",
          confidence: 0.95,
          baselineClass: "DoS/DDoS",
          score: 85,
          riskLevel: "Critical",
          explanation: [{ factor: "class", contribution: 85 }]
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

      const csvData = generateMockCsv(2);

      const res = await request(app)
        .post("/api/datasets/upload")
        .set("Authorization", `Bearer ${analystToken}`)
        .attach("file", Buffer.from(csvData), "capture_monday.csv")
        .field("name", "Monday Capture")
        .expect(201);

      expect(res.body.status).toBe("success");
      const dataset = res.body.data.dataset;
      expect(dataset.name).toBe("Monday Capture");
      expect(dataset.status).toBe("completed");
      expect(dataset.progress).toBe(100);
      expect(dataset.rowCount).toBe(2);
      expect(dataset.benignCount).toBe(1);
      expect(dataset.incidentCount).toBe(1);

      // Verify Incident collection in MongoDB has exactly 1 incident (the DoS/DDoS flow)
      const incidents = await Incident.find({ datasetId: dataset._id });
      expect(incidents.length).toBe(1);
      expect(incidents[0].mlClass).toBe("DoS/DDoS");
      expect(incidents[0].score).toBe(85);

      // Verify AuditLog entry recorded
      const audit = await AuditLog.findOne({ action: AUDIT_ACTIONS.DATASET_UPLOAD });
      expect(audit).toBeDefined();
      expect(audit.details.datasetName).toBe("Monday Capture");
    });
  });

  describe("3. Dataset Queries & Admin Deletion", () => {
    let datasetId;

    beforeEach(async () => {
      const dataset = await Dataset.create({
        name: "Historical Set",
        originalFilename: "history.csv",
        sizeBytes: 1024,
        rowCount: 50,
        benignCount: 40,
        incidentCount: 10,
        status: "completed",
        progress: 100,
        uploadedBy: analystUser._id
      });
      datasetId = dataset._id;

      await Incident.create({
        detectedAt: new Date(),
        source: "192.168.1.50",
        destination: "10.0.0.1",
        mlClass: "PortScan",
        confidence: 0.9,
        baselineClass: "Benign",
        score: 75,
        riskLevel: "High",
        explanation: [{ factor: "scan", contribution: 75 }],
        datasetId
      });
    });

    it("allows authenticated users to query dataset list and detail", async () => {
      const listRes = await request(app)
        .get("/api/datasets?page=1&limit=10")
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(200);

      expect(listRes.body.status).toBe("success");
      expect(listRes.body.data.datasets.length).toBe(1);

      const detailRes = await request(app)
        .get(`/api/datasets/${datasetId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(200);

      expect(detailRes.body.data.dataset.name).toBe("Historical Set");
      expect(detailRes.body.data.dataset.incidentCount).toBe(10);
    });

    it("restricts dataset deletion to Admin only and cascades incident deletion", async () => {
      // Analyst cannot delete -> 403
      await request(app)
        .delete(`/api/datasets/${datasetId}`)
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(403);

      // Admin can delete -> 200
      const res = await request(app)
        .delete(`/api/datasets/${datasetId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");

      // Verify dataset and cascade deleted incidents are removed
      const existsDataset = await Dataset.findById(datasetId);
      expect(existsDataset).toBeNull();

      const remainingIncidents = await Incident.countDocuments({ datasetId });
      expect(remainingIncidents).toBe(0);

      // Verify AuditLog entry recorded
      const audit = await AuditLog.findOne({ action: AUDIT_ACTIONS.DATASET_DELETE });
      expect(audit).toBeDefined();
    });
  });
});
