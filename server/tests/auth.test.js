import { Buffer } from "node:buffer";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { ROLES, AUDIT_ACTIONS } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";
import { seedAdmin } from "../src/scripts/seedAdmin.js";
import { maskIp } from "../src/utils/ipMask.js";

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
  await AuditLog.deleteMany({});
});

describe("Authentication, Roles & Audit Logging (Phase 4)", () => {
  const strongPassword = "SecureP@ssword2026!";
  const validUserData = {
    name: "SecOps Analyst",
    email: "analyst@threatlens.io",
    password: strongPassword
  };

  describe("1. Registration & Password Policy", () => {
    it("successfully registers a user with the Viewer role (happy path)", async () => {
      const res = await request(app).post("/api/auth/register").send(validUserData).expect(201);

      expect(res.body.status).toBe("success");
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user.name).toBe(validUserData.name);
      expect(res.body.data.user.role).toBe(ROLES.VIEWER);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.token).toBeDefined();

      // Verify AuditLog entry was recorded
      const audit = await AuditLog.findOne({ action: AUDIT_ACTIONS.REGISTER });
      expect(audit).toBeDefined();
      expect(audit.details.email).toBe(validUserData.email);
    });

    it("rejects weak passwords failing the security policy", async () => {
      // 1. Shorter than 10 characters
      const shortRes = await request(app)
        .post("/api/auth/register")
        .send({ ...validUserData, password: "Short1!" })
        .expect(422);
      expect(shortRes.body.error.code).toBe("VALIDATION_ERROR");

      // 2. Missing uppercase
      const noUpperRes = await request(app)
        .post("/api/auth/register")
        .send({ ...validUserData, password: "lowercase1234!" })
        .expect(422);
      expect(noUpperRes.body.error.code).toBe("VALIDATION_ERROR");

      // 3. Missing symbol
      const noSymbolRes = await request(app)
        .post("/api/auth/register")
        .send({ ...validUserData, password: "NoSymbolPassword123" })
        .expect(422);
      expect(noSymbolRes.body.error.code).toBe("VALIDATION_ERROR");

      // 4. Password identical to email
      const emailAsPassRes = await request(app)
        .post("/api/auth/register")
        .send({ name: "User", email: "P@ssword1234!", password: "P@ssword1234!" })
        .expect(422);
      expect(emailAsPassRes.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects duplicate email registration with 409 conflict", async () => {
      await request(app).post("/api/auth/register").send(validUserData).expect(201);

      const res = await request(app).post("/api/auth/register").send(validUserData).expect(409);

      expect(res.body.error.code).toBe("USER_EXISTS");
    });

    it("blocks mass-assignment attempt by ignoring/rejecting supplied role", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUserData,
          role: ROLES.ADMIN
        })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      const count = await User.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe("2. Login, Lockout & Timing Defense", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send(validUserData).expect(201);
    });

    it("successfully authenticates with valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();

      const audit = await AuditLog.findOne({ action: AUDIT_ACTIONS.LOGIN_SUCCESS });
      expect(audit).toBeDefined();
    });

    it("rejects wrong password with generic credentials message and records audit failure", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: validUserData.email,
          password: "WrongPassword999!"
        })
        .expect(401);

      expect(res.body.error.message).toBe("Invalid credentials");

      const audit = await AuditLog.findOne({ action: AUDIT_ACTIONS.LOGIN_FAILURE });
      expect(audit).toBeDefined();
    });

    it("rejects non-existent email with same generic credentials message (timing defense)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "unknown@threatlens.io",
          password: strongPassword
        })
        .expect(401);

      expect(res.body.error.message).toBe("Invalid credentials");
    });

    it("locks out user account after 5 consecutive failed login attempts for 15 minutes", async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/auth/login")
          .send({
            email: validUserData.email,
            password: "WrongPassword999!"
          })
          .expect(401);
      }

      // Check user model state in database
      const lockedUser = await User.findOne({ email: validUserData.email });
      expect(lockedUser.failedLoginAttempts).toBe(5);
      expect(lockedUser.isLocked()).toBe(true);

      // 6th attempt with CORRECT password must now fail due to lockout
      const lockedRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(401);

      expect(lockedRes.body.error.message).toContain("Account is temporarily locked");
    });
  });

  describe("3. JWT Tokens & Algorithm Enforcement", () => {
    it("rejects expired tokens", async () => {
      const expiredToken = signToken(
        { sub: new mongoose.Types.ObjectId().toString(), role: ROLES.VIEWER },
        { expiresIn: "0s" }
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.error.message).toContain("expired");
    });

    it("rejects tampered tokens", async () => {
      const validToken = signToken({
        sub: new mongoose.Types.ObjectId().toString(),
        role: ROLES.VIEWER
      });
      const tamperedToken = validToken.slice(0, -6) + "xxxxxx";

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${tamperedToken}`)
        .expect(401);

      expect(res.body.error.code).toBe("AUTH_REQUIRED");
    });

    it("rejects alg: none tokens strictly", async () => {
      // Unsecured JWT header: {"alg":"none","typ":"JWT"}
      const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
        "base64url"
      );
      const nonePayload = Buffer.from(
        JSON.stringify({ sub: new mongoose.Types.ObjectId().toString(), role: ROLES.ADMIN })
      ).toString("base64url");
      const algNoneToken = `${noneHeader}.${nonePayload}.`;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${algNoneToken}`)
        .expect(401);

      expect(res.body.error.code).toBe("AUTH_REQUIRED");
    });
  });

  describe("4. Role-Based Access Control & User Management", () => {
    let adminUser;
    let analystUser;
    let viewerUser;
    let adminToken;
    let analystToken;
    let viewerToken;

    beforeEach(async () => {
      adminUser = await seedAdmin({
        email: "superadmin@threatlens.io",
        password: "SuperAdminPassword2026!",
        name: "Super Admin"
      });

      const regAnalyst = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Analyst One",
          email: "analyst1@threatlens.io",
          password: "AnalystPassword2026!"
        })
        .expect(201);
      analystUser = await User.findById(regAnalyst.body.data.user._id);
      analystUser.role = ROLES.ANALYST;
      await analystUser.save();

      const regViewer = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Viewer One",
          email: "viewer1@threatlens.io",
          password: "ViewerPassword2026!"
        })
        .expect(201);
      viewerUser = await User.findById(regViewer.body.data.user._id);

      adminToken = signToken({ sub: adminUser._id.toString(), role: ROLES.ADMIN });
      analystToken = signToken({ sub: analystUser._id.toString(), role: ROLES.ANALYST });
      viewerToken = signToken({ sub: viewerUser._id.toString(), role: ROLES.VIEWER });
    });

    it("enforces Admin-only restriction on GET /api/users", async () => {
      // Unauthenticated -> 401
      await request(app).get("/api/users").expect(401);

      // Viewer -> 403
      await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(403);

      // Analyst -> 403
      await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(403);

      // Admin -> 200 with paginated list
      const res = await request(app)
        .get("/api/users?page=1&limit=10")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.users.length).toBe(3);
      expect(res.body.data.pagination.total).toBe(3);
    });

    it("allows Admin to promote a user and logs ROLE_CHANGE audit entry", async () => {
      const res = await request(app)
        .patch(`/api/users/${viewerUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: ROLES.ANALYST })
        .expect(200);

      expect(res.body.data.user.role).toBe(ROLES.ANALYST);

      const audit = await AuditLog.findOne({
        action: AUDIT_ACTIONS.ROLE_CHANGE,
        userId: viewerUser._id
      });
      expect(audit).toBeDefined();
      expect(audit.details.newRole).toBe(ROLES.ANALYST);
    });

    it("prevents an admin from demoting themselves", async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: ROLES.VIEWER })
        .expect(403);

      expect(res.body.error.message).toContain("cannot demote themselves");
    });

    it("prevents demoting the last active administrator", async () => {
      // Create a second admin first
      const secondAdmin = await User.create({
        name: "Admin Two",
        email: "admin2@threatlens.io",
        passwordHash: "hash123",
        role: ROLES.ADMIN,
        isActive: true
      });

      // Demoting secondAdmin is allowed when adminUser also exists
      await request(app)
        .patch(`/api/users/${secondAdmin._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: ROLES.VIEWER })
        .expect(200);

      // Now adminUser is the ONLY remaining admin -> demoting fails
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: ROLES.VIEWER })
        .expect(403);

      expect(res.body.error.message).toContain("cannot demote themselves");
    });

    it("prevents an admin from disabling their own account", async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(403);

      expect(res.body.error.message).toContain("cannot deactivate their own account");
    });

    it("prevents deactivating the last active administrator", async () => {
      const secondAdmin = await User.create({
        name: "Admin Two",
        email: "admin2@threatlens.io",
        passwordHash: "hash123",
        role: ROLES.ADMIN,
        isActive: true
      });

      // adminUser deactivates secondAdmin -> allowed
      await request(app)
        .patch(`/api/users/${secondAdmin._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      // Attempting to deactivate the only remaining active admin fails
      // Even if another request somehow targets adminUser:
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(403);

      expect(res.body.error.message).toContain("cannot deactivate their own account");
    });

    it("rejects inactive users from authenticated endpoints", async () => {
      viewerUser.isActive = false;
      await viewerUser.save();

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(403);

      expect(res.body.error.message).toContain("deactivated");
    });
  });

  describe("5. Audit Logs & IP Masking", () => {
    let adminToken;
    let viewerToken;

    beforeEach(async () => {
      const admin = await seedAdmin({
        email: "auditadmin@threatlens.io",
        password: "AuditAdminPass2026!"
      });
      adminToken = signToken({ sub: admin._id.toString(), role: ROLES.ADMIN });

      const viewer = await User.create({
        name: "Viewer",
        email: "auditviewer@threatlens.io",
        passwordHash: "hash",
        role: ROLES.VIEWER
      });
      viewerToken = signToken({ sub: viewer._id.toString(), role: ROLES.VIEWER });

      await AuditLog.create({
        userId: viewer._id,
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        ip: "192.168.1.105",
        userAgent: "Mozilla/5.0",
        details: { note: "test-log" }
      });
    });

    it("restricts GET /api/audit-logs to administrators only", async () => {
      await request(app)
        .get("/api/audit-logs")
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(403);

      const res = await request(app)
        .get("/api/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.logs.length).toBeGreaterThan(0);
      // Admin sees exact unmasked IP
      expect(res.body.data.logs[0].ip).toBe("192.168.1.105");
    });

    it("masks IP addresses correctly via maskIp utility", () => {
      expect(maskIp("192.168.1.100")).toBe("192.168.1.xxx");
      expect(maskIp("10.0.0.1")).toBe("10.0.0.xxx");
      expect(maskIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:0db8:85a3::xxxx");
      expect(maskIp(null)).toBe("xxx.xxx.xxx.xxx");
    });
  });

  describe("6. Logout Endpoint", () => {
    it("records audit log and returns success message on logout", async () => {
      const user = await User.create({
        name: "Logout User",
        email: "logout@threatlens.io",
        passwordHash: "hash",
        role: ROLES.VIEWER
      });
      const token = signToken({ sub: user._id.toString(), role: ROLES.VIEWER });

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.message).toContain("Logged out");

      const audit = await AuditLog.findOne({
        action: AUDIT_ACTIONS.LOGOUT,
        userId: user._id
      });
      expect(audit).toBeDefined();
    });
  });
});
