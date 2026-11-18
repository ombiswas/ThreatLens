import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { ROLES } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";
import { mlClient } from "../src/services/mlClient.js";
import { FEATURE_NAMES } from "../src/validators/detectValidators.js";
import { ServiceUnavailableError } from "../src/errors/AppError.js";

let mongoServer;
let app;

// Create a canonical valid flow record with all 67 required features
function createValidFlowRecord(overrides = {}) {
  const record = {};
  for (const name of FEATURE_NAMES) {
    record[name] = 0.0;
  }
  record["Destination Port"] = 80;
  record["Flow Duration"] = 150000;
  record["Total Fwd Packets"] = 10;
  record["Total Backward Packets"] = 8;
  record["Flow Packets/s"] = 120.0;
  return { ...record, ...overrides };
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
  vi.restoreAllMocks();
});

describe("Detection Core & API Endpoint (detectController & detectionService)", () => {
  let analystUser;
  let viewerUser;
  let analystToken;
  let viewerToken;

  beforeEach(async () => {
    analystUser = await User.create({
      name: "Security Analyst",
      email: "analyst@threatlens.io",
      passwordHash: "hash",
      role: ROLES.ANALYST
    });

    viewerUser = await User.create({
      name: "SOC Viewer",
      email: "viewer@threatlens.io",
      passwordHash: "hash",
      role: ROLES.VIEWER
    });

    analystToken = signToken({ sub: analystUser._id.toString(), role: ROLES.ANALYST });
    viewerToken = signToken({ sub: viewerUser._id.toString(), role: ROLES.VIEWER });
  });

  describe("Authentication & RBAC Enforcement", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post("/api/detect")
        .send({ flow: createValidFlowRecord() })
        .expect(401);

      expect(res.body.error.code).toBe("AUTH_REQUIRED");
    });

    it("rejects Viewer role with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/detect")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ flow: createValidFlowRecord() })
        .expect(403);

      expect(res.body.error.code).toBe("ACCESS_FORBIDDEN");
    });
  });

  describe("Schema Validation", () => {
    it("rejects unknown extra fields with 422 VALIDATION_ERROR (strict schema)", async () => {
      const payloadWithExtra = {
        flow: {
          ...createValidFlowRecord(),
          maliciousExtraKey: "attack_payload"
        }
      };

      const res = await request(app)
        .post("/api/detect")
        .set("Authorization", `Bearer ${analystToken}`)
        .send(payloadWithExtra)
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects missing features with 422", async () => {
      const incompleteRecord = {
        "Destination Port": 80
        // Missing remaining 66 features
      };

      const res = await request(app)
        .post("/api/detect")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ flow: incompleteRecord })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects batches exceeding MAX_DETECT_BATCH_SIZE (100)", async () => {
      const sample = createValidFlowRecord();
      const oversizedBatch = Array.from({ length: 101 }, () => sample);

      const res = await request(app)
        .post("/api/detect")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ flows: oversizedBatch })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Detection & Combined Scoring Flow", () => {
    it("classifies single flow record and returns combined ML, baseline, and score", async () => {
      vi.spyOn(mlClient, "predictSingle").mockResolvedValue({
        predicted_class: "DoS/DDoS",
        confidence: 0.95,
        probabilities: { "DoS/DDoS": 0.95, Benign: 0.05, PortScan: 0.0, BruteForce: 0.0 }
      });

      const flowRecord = createValidFlowRecord({
        "Flow Packets/s": 750.0 // triggers DoS baseline heuristic
      });

      const res = await request(app)
        .post("/api/detect")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ flow: flowRecord })
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.mlClass).toBe("DoS/DDoS");
      expect(res.body.data.confidence).toBe(0.95);
      expect(res.body.data.baselineClass).toBe("DoS/DDoS");
      expect(res.body.data.score).toBeGreaterThan(80);
      expect(res.body.data.riskLevel).toBe("Critical");
      expect(res.body.data.explanation.length).toBe(2);

      const sumFactors = res.body.data.explanation.reduce((acc, f) => acc + f.contribution, 0);
      expect(sumFactors).toBe(res.body.data.score);
    });

    it("classifies batch of flow records and returns indexed results with count", async () => {
      vi.spyOn(mlClient, "predictBatch").mockResolvedValue({
        count: 2,
        predictions: [
          {
            predicted_class: "Benign",
            confidence: 0.99,
            probabilities: { Benign: 0.99, "DoS/DDoS": 0.01 }
          },
          {
            predicted_class: "PortScan",
            confidence: 0.92,
            probabilities: { PortScan: 0.92, Benign: 0.08 }
          }
        ]
      });

      const flows = [
        createValidFlowRecord({ "Destination Port": 80 }),
        createValidFlowRecord({
          "Destination Port": 8080,
          "Flow Duration": 1000,
          "Total Backward Packets": 0
        })
      ];

      const res = await request(app)
        .post("/api/detect")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ flows })
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.count).toBe(2);
      expect(res.body.data[0].mlClass).toBe("Benign");
      expect(res.body.data[0].score).toBe(0);
      expect(res.body.data[1].mlClass).toBe("PortScan");
      expect(res.body.data[1].score).toBeGreaterThan(0);
    });

    it("returns 503 SERVICE_UNAVAILABLE (not 500) when ML microservice is down", async () => {
      vi.spyOn(mlClient, "predictSingle").mockRejectedValue(
        new ServiceUnavailableError("ML detection service is temporarily unavailable")
      );

      const res = await request(app)
        .post("/api/detect")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ flow: createValidFlowRecord() })
        .expect(503);

      expect(res.body.error.code).toBe("SERVICE_UNAVAILABLE");
      expect(res.body.error.message).toContain("temporarily unavailable");
    });
  });
});
