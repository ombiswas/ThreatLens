import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Notification } from "../src/models/Notification.js";
import { checkAndTriggerAlert } from "../src/services/alertService.js";
import { ROLES, ATTACK_CLASSES, RISK_LEVELS } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";

describe("Notifications & Critical Incident Alerting (Phase 7)", () => {
  let mongoServer;
  let app;
  let analystUser;
  let viewerUser;
  let analystToken;
  let viewerToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();

    analystUser = await User.create({
      name: "Alert Analyst",
      email: "alert.analyst@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ANALYST,
      isActive: true
    });
    analystToken = signToken({ sub: analystUser._id.toString(), role: ROLES.ANALYST });

    viewerUser = await User.create({
      name: "Alert Viewer",
      email: "alert.viewer@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.VIEWER,
      isActive: true
    });
    viewerToken = signToken({ sub: viewerUser._id.toString(), role: ROLES.VIEWER });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("creates an in-app notification when incident is Critical", async () => {
    const criticalIncident = {
      _id: new mongoose.Types.ObjectId(),
      mlClass: ATTACK_CLASSES.DOS_DDOS,
      riskLevel: RISK_LEVELS.CRITICAL,
      score: 92,
      confidence: 0.94,
      destination: "10.0.0.1",
      protocol: "TCP"
    };

    const notification = await checkAndTriggerAlert({ incident: criticalIncident });

    expect(notification).not.toBeNull();
    expect(notification.title).toContain("Critical Threat Alert: DoS/DDoS");
    expect(notification.severity).toBe("Critical");
    expect(notification.targetRoles).toContain(ROLES.ANALYST);
    expect(notification.targetRoles).toContain(ROLES.ADMIN);
  });

  it("does not create a notification when incident is Medium or Low", async () => {
    const mediumIncident = {
      _id: new mongoose.Types.ObjectId(),
      mlClass: ATTACK_CLASSES.PORTSCAN,
      riskLevel: RISK_LEVELS.MEDIUM,
      score: 45
    };

    const notification = await checkAndTriggerAlert({ incident: mediumIncident });
    expect(notification).toBeNull();
  });

  it("enforces role scoping: Analyst sees analyst notifications, Viewer does not", async () => {
    const analystRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(analystRes.status).toBe(200);
    expect(analystRes.body.data.notifications.length).toBeGreaterThan(0);
    expect(analystRes.body.data.notifications[0].isRead).toBe(false);

    const viewerRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(viewerRes.status).toBe(200);
    // Viewer is not in targetRoles [admin, analyst], so list is empty
    expect(viewerRes.body.data.notifications.length).toBe(0);
  });

  it("PATCH /api/notifications/:id/read marks notification as read for current user", async () => {
    const existing = await Notification.findOne({ targetRoles: ROLES.ANALYST });

    const patchRes = await request(app)
      .patch(`/api/notifications/${existing._id}/read`)
      .set("Authorization", `Bearer ${analystToken}`);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.notification.isRead).toBe(true);

    // Verify unreadOnly filter now omits this notification
    const unreadRes = await request(app)
      .get("/api/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(unreadRes.status).toBe(200);
    expect(
      unreadRes.body.data.notifications.some((n) => n._id.toString() === existing._id.toString())
    ).toBe(false);
  });

  it("PATCH /api/notifications/read-all marks all notifications read for current user", async () => {
    // Create another notification
    await Notification.create({
      title: "Second Alert",
      message: "Testing read-all capability",
      severity: "Warning",
      targetRoles: [ROLES.ANALYST]
    });

    const markAllRes = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(markAllRes.status).toBe(200);

    const getRes = await request(app)
      .get("/api/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(getRes.body.data.notifications.length).toBe(0);
  });
});
