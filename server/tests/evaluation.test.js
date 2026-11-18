import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Dataset } from "../src/models/Dataset.js";
import { Incident } from "../src/models/Incident.js";
import {
  computeMetricsFromMatrix,
  normalizeGroundTruthLabel
} from "../src/services/evaluationService.js";
import { ROLES, ATTACK_CLASSES, RISK_LEVELS } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";

describe("Evaluation & Comparative Metrics (Phase 7)", () => {
  let mongoServer;
  let app;
  let analystToken;
  let testDataset;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    const analyst = await User.create({
      name: "Eval Analyst",
      email: "eval.analyst@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ANALYST,
      isActive: true
    });
    analystToken = signToken({ sub: analyst._id.toString(), role: ROLES.ANALYST });

    testDataset = await Dataset.create({
      name: "Eval Ground Truth Dataset",
      originalFilename: "eval.csv",
      sizeBytes: 1000,
      rowCount: 50,
      benignCount: 25,
      incidentCount: 25,
      status: "completed",
      uploadedBy: analyst._id,
      // Minimal CSV with 2 rows for testing computeDatasetEvaluation
      rawCsv:
        "Destination Port,Flow Duration,Total Fwd Packets,Total Backward Packets,Total Length of Fwd Packets,Total Length of Bwd Packets,Fwd Packet Length Max,Fwd Packet Length Min,Fwd Packet Length Mean,Fwd Packet Length Std,Bwd Packet Length Max,Bwd Packet Length Min,Bwd Packet Length Mean,Bwd Packet Length Std,Flow Bytes/s,Flow Packets/s,Flow IAT Mean,Flow IAT Std,Flow IAT Max,Flow IAT Min,Fwd IAT Total,Fwd IAT Mean,Fwd IAT Std,Fwd IAT Max,Fwd IAT Min,Bwd IAT Total,Bwd IAT Mean,Bwd IAT Std,Bwd IAT Max,Bwd IAT Min,Fwd PSH Flags,Bwd PSH Flags,Fwd URG Flags,Bwd URG Flags,Fwd Header Length,Bwd Header Length,Fwd Packets/s,Bwd Packets/s,Min Packet Length,Max Packet Length,Packet Length Mean,Packet Length Std,Packet Length Variance,FIN Flag Count,SYN Flag Count,RST Flag Count,PSH Flag Count,ACK Flag Count,URG Flag Count,CWE Flag Count,ECE Flag Count,Down/Up Ratio,Average Packet Size,Avg Fwd Segment Size,Avg Bwd Segment Size,Fwd Header Length.1,Fwd Avg Bytes/Bulk,Fwd Avg Packets/Bulk,Fwd Avg Bulk Rate,Bwd Avg Bytes/Bulk,Bwd Avg Packets/Bulk,Bwd Avg Bulk Rate,Subflow Fwd Packets,Subflow Fwd Bytes,Subflow Bwd Packets,Subflow Bwd Bytes,Init_Win_bytes_forward,Init_Win_bytes_backward,act_data_pkt_fwd,min_seg_size_forward,Active Mean,Active Std,Active Max,Active Min,Idle Mean,Idle Std,Idle Max,Idle Min,Label,Source IP,Destination IP,Protocol\n" +
        "80,5000,10,2,500,100,50,10,25,5,50,10,25,5,1000,550,100,10,150,50,500,50,10,100,10,200,20,5,50,5,0,0,0,0,20,20,100,50,10,50,25,5,25,0,1,0,0,1,0,0,0,1,25,25,25,20,0,0,0,0,0,0,10,500,2,100,8192,8192,5,20,0,0,0,0,0,0,0,0,DoS Hulk,192.168.1.10,10.0.0.1,TCP\n" +
        "22,1000,5,1,200,50,40,10,20,5,50,10,25,5,500,50,100,10,150,50,500,50,10,100,10,200,20,5,50,5,0,0,0,0,20,20,50,10,10,40,20,5,25,0,1,0,0,1,0,0,0,1,20,20,20,20,0,0,0,0,0,0,5,200,1,50,8192,8192,3,20,0,0,0,0,0,0,0,0,SSH-Patator,192.168.1.20,10.0.0.2,TCP\n"
    });

    await Incident.create([
      {
        detectedAt: new Date(),
        source: "192.168.1.10",
        destination: "10.0.0.1",
        protocol: "TCP",
        mlClass: ATTACK_CLASSES.DOS_DDOS,
        confidence: 0.95,
        baselineClass: ATTACK_CLASSES.DOS_DDOS,
        score: 95,
        riskLevel: RISK_LEVELS.CRITICAL,
        datasetId: testDataset._id,
        groundTruthLabel: "DoS Hulk",
        createdBy: analyst._id
      },
      {
        detectedAt: new Date(),
        source: "192.168.1.20",
        destination: "10.0.0.2",
        protocol: "TCP",
        mlClass: ATTACK_CLASSES.BRUTEFORCE,
        confidence: 0.88,
        baselineClass: ATTACK_CLASSES.BRUTEFORCE,
        score: 85,
        riskLevel: RISK_LEVELS.CRITICAL,
        datasetId: testDataset._id,
        groundTruthLabel: "SSH-Patator",
        createdBy: analyst._id
      }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("computes accurate classification metrics from a multi-class confusion matrix", () => {
    // Hand-crafted 2-class confusion matrix for verification:
    // Class A: TP = 8, FN = 2 (Total True A = 10)
    // Class B: TP = 18, FN = 2 (Total True B = 20)
    // Predictions for A: TP = 8, FP = 2 (Pred A = 10) -> Precision = 8/10 = 0.8, Recall = 8/10 = 0.8, F1 = 0.8
    // Predictions for B: TP = 18, FP = 2 (Pred B = 20) -> Precision = 18/20 = 0.9, Recall = 18/20 = 0.9, F1 = 0.9
    // Accuracy = (8 + 18) / 30 = 26 / 30 = 0.8667
    const matrix = {
      ClassA: { ClassA: 8, ClassB: 2 },
      ClassB: { ClassA: 2, ClassB: 18 }
    };

    const metrics = computeMetricsFromMatrix(matrix, ["ClassA", "ClassB"]);

    expect(metrics.accuracy).toBe(0.8667);
    expect(metrics.perClass.ClassA.precision).toBe(0.8);
    expect(metrics.perClass.ClassA.recall).toBe(0.8);
    expect(metrics.perClass.ClassA.f1Score).toBe(0.8);

    expect(metrics.perClass.ClassB.precision).toBe(0.9);
    expect(metrics.perClass.ClassB.recall).toBe(0.9);
    expect(metrics.perClass.ClassB.f1Score).toBe(0.9);

    expect(metrics.macroF1).toBe(0.85); // (0.8 + 0.9) / 2
  });

  it("normalizes ground truth labels correctly across CIC-IDS2017 naming variants", () => {
    expect(normalizeGroundTruthLabel("DoS Hulk")).toBe(ATTACK_CLASSES.DOS_DDOS);
    expect(normalizeGroundTruthLabel("DDoS")).toBe(ATTACK_CLASSES.DOS_DDOS);
    expect(normalizeGroundTruthLabel("FTP-Patator")).toBe(ATTACK_CLASSES.BRUTEFORCE);
    expect(normalizeGroundTruthLabel("SSH-Patator")).toBe(ATTACK_CLASSES.BRUTEFORCE);
    expect(normalizeGroundTruthLabel("PortScan")).toBe(ATTACK_CLASSES.PORTSCAN);
    expect(normalizeGroundTruthLabel("BENIGN")).toBe(ATTACK_CLASSES.BENIGN);
    expect(normalizeGroundTruthLabel(null)).toBe(ATTACK_CLASSES.BENIGN);
  });

  it("GET /api/evaluation/dataset/:id returns comparative live evaluation between ML and baseline", async () => {
    const res = await request(app)
      .get(`/api/evaluation/dataset/${testDataset._id}`)
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    const data = res.body.data;

    expect(data.datasetName).toBe("Eval Ground Truth Dataset");
    expect(data.totalEvaluated).toBe(2);
    expect(data.mlModel).toBeDefined();
    expect(data.baseline).toBeDefined();

    // Both flows were correctly predicted: DoS Hulk -> DoS/DDoS, SSH-Patator -> BruteForce
    expect(data.mlModel.accuracy).toBe(1.0);
    expect(data.mlModel.perClass["DoS/DDoS"].tp).toBe(1);
    expect(data.mlModel.perClass["BruteForce"].tp).toBe(1);
  });
});
