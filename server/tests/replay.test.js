import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { stopAllReplays } from "../src/services/replayService.js";
import { ROLES } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";

describe("Real-Time Replay Engine & Lifecycle (Phase 7)", () => {
  let mongoServer;
  let app;
  let analystToken;
  let viewerToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    const analyst = await User.create({
      name: "Replay Analyst",
      email: "replay.analyst@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ANALYST,
      isActive: true
    });
    analystToken = signToken({ sub: analyst._id.toString(), role: ROLES.ANALYST });

    const viewer = await User.create({
      name: "Replay Viewer",
      email: "replay.viewer@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.VIEWER,
      isActive: true
    });
    viewerToken = signToken({ sub: viewer._id.toString(), role: ROLES.VIEWER });
  });

  afterAll(async () => {
    stopAllReplays();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("enforces role protection: blocks Viewer and requires Analyst/Admin", async () => {
    const unauthRes = await request(app)
      .post("/api/replay/start")
      .send({ datasetId: "demo", ratePerSecond: 10 });
    expect(unauthRes.status).toBe(401);

    const viewerRes = await request(app)
      .post("/api/replay/start")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ datasetId: "demo", ratePerSecond: 10 });
    expect(viewerRes.status).toBe(403);
  });

  it("validates ratePerSecond is bounded between 1 and 50", async () => {
    const tooHighRes = await request(app)
      .post("/api/replay/start")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ datasetId: "demo", ratePerSecond: 100 });
    expect(tooHighRes.status).toBe(422);

    const zeroRes = await request(app)
      .post("/api/replay/start")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ datasetId: "demo", ratePerSecond: 0 });
    expect(zeroRes.status).toBe(422);
  });

  it("successfully starts a replay session for demo dataset", async () => {
    const startRes = await request(app)
      .post("/api/replay/start")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ datasetId: "demo", ratePerSecond: 10 });

    expect(startRes.status).toBe(200);
    expect(startRes.body.status).toBe("success");
    expect(startRes.body.data.status).toBe("started");
    expect(startRes.body.data.totalRows).toBeGreaterThan(0);

    // Verify GET /api/replay/status returns active state
    const statusRes = await request(app)
      .get("/api/replay/status")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.active).toBe(true);
    expect(statusRes.body.data.datasetName).toContain("Demo");
  });

  it("rejects concurrent replay attempt with 409 Conflict", async () => {
    const duplicateRes = await request(app)
      .post("/api/replay/start")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ datasetId: "demo", ratePerSecond: 20 });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe("REPLAY_ALREADY_ACTIVE");
  });

  it("POST /api/replay/stop cleanly stops session and cleans up timers", async () => {
    const stopRes = await request(app)
      .post("/api/replay/stop")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(stopRes.status).toBe(200);
    expect(stopRes.body.data.status).toBe("stopped");

    // Verify status is now inactive
    const statusRes = await request(app)
      .get("/api/replay/status")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.active).toBe(false);
  });
});
