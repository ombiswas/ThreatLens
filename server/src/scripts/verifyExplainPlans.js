import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Incident } from "../models/Incident.js";
import { AuditLog } from "../models/AuditLog.js";

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Ensure indexes are built
  await Incident.init();
  await AuditLog.init();

  const indexes = await Incident.collection.indexes();
  console.log("Incident Indexes:", JSON.stringify(indexes.map(idx => idx.key), null, 2));

  // Insert mock records
  await Incident.create([
    {
      flowId: "flow-1",
      mlClass: "DoS/DDoS",
      confidence: 0.98,
      baselineClass: "DoS/DDoS",
      score: 92,
      riskLevel: "Critical",
      flowSummary: { srcIp: "192.168.1.10", dstIp: "10.0.0.1", srcPort: 44321, dstPort: 80, protocol: "TCP" },
      detectedAt: new Date()
    },
    {
      flowId: "flow-2",
      mlClass: "PortScan",
      confidence: 0.85,
      baselineClass: "PortScan",
      score: 65,
      riskLevel: "High",
      flowSummary: { srcIp: "192.168.1.25", dstIp: "10.0.0.1", srcPort: 54321, dstPort: 22, protocol: "TCP" },
      detectedAt: new Date(Date.now() - 60000)
    }
  ]);

  // Query 1: Filter by riskLevel, sort by detectedAt
  const explain1 = await Incident.find({ riskLevel: "Critical" })
    .sort({ detectedAt: -1 })
    .explain("executionStats");

  const stage1 = explain1.queryPlanner.winningPlan;
  console.log("Query 1 winning plan stage:", stage1.stage);
  if (stage1.inputStage) {
    console.log("Query 1 input stage:", stage1.inputStage.stage, "index:", stage1.inputStage.indexName);
  }

  // Query 2: Filter by status and riskLevel, sort by detectedAt
  const explain2 = await Incident.find({ status: "New", riskLevel: "Critical" })
    .sort({ detectedAt: -1 })
    .explain("executionStats");

  const stage2 = explain2.queryPlanner.winningPlan;
  console.log("Query 2 winning plan stage:", stage2.stage);
  if (stage2.inputStage) {
    console.log("Query 2 input stage:", stage2.inputStage.stage, "index:", stage2.inputStage.indexName);
  }

  await mongoose.disconnect();
  await mongoServer.stop();
  console.log("Explain plan analysis complete.");
}

main().catch((err) => {
  console.error("Explain plan check failed:", err);
  process.exit(1);
});
