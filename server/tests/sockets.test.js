import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { io as Client } from "socket.io-client";
import { createApp } from "../src/app.js";
import { initSocketServer, emitNewIncident } from "../src/sockets/socketManager.js";
import { User } from "../src/models/User.js";
import { ROLES, ATTACK_CLASSES, RISK_LEVELS } from "../src/utils/constants.js";
import { signToken } from "../src/utils/jwt.js";

describe("Socket.IO Real-Time Telemetry & Authentication (Phase 7)", () => {
  let mongoServer;
  let httpServer;
  let io;
  let serverPort;
  let adminUser;
  let analystUser;
  let adminToken;
  let analystToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const app = createApp();
    httpServer = http.createServer(app);
    io = initSocketServer(httpServer, "http://localhost:5173");
    app.set("io", io);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });

    adminUser = await User.create({
      name: "Socket Admin",
      email: "socket.admin@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ADMIN,
      isActive: true
    });
    adminToken = signToken({ sub: adminUser._id.toString(), role: ROLES.ADMIN });

    analystUser = await User.create({
      name: "Socket Analyst",
      email: "socket.analyst@threatlens.io",
      passwordHash: "hash123456",
      role: ROLES.ANALYST,
      isActive: true
    });
    analystToken = signToken({ sub: analystUser._id.toString(), role: ROLES.ANALYST });
  });

  afterAll(async () => {
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("rejects connection when handshake token is missing", async () => {
    const client = Client(`http://localhost:${serverPort}`, {
      transports: ["websocket"],
      autoConnect: false
    });

    await expect(
      new Promise((resolve, reject) => {
        client.on("connect_error", (err) => {
          client.close();
          reject(err);
        });
        client.on("connect", () => {
          client.close();
          resolve();
        });
        client.connect();
      })
    ).rejects.toThrow(/Authentication error/);
  });

  it("rejects connection when token is tampered or invalid", async () => {
    const client = Client(`http://localhost:${serverPort}`, {
      auth: { token: "invalid.tampered.token" },
      transports: ["websocket"],
      autoConnect: false
    });

    await expect(
      new Promise((resolve, reject) => {
        client.on("connect_error", (err) => {
          client.close();
          reject(err);
        });
        client.on("connect", () => {
          client.close();
          resolve();
        });
        client.connect();
      })
    ).rejects.toThrow(/Authentication error/);
  });

  it("successfully connects with valid JWT token in auth payload", async () => {
    const client = Client(`http://localhost:${serverPort}`, {
      auth: { token: adminToken },
      transports: ["websocket"],
      autoConnect: false
    });

    await new Promise((resolve, reject) => {
      client.on("connect", () => {
        expect(client.connected).toBe(true);
        client.close();
        resolve();
      });
      client.on("connect_error", (err) => {
        client.close();
        reject(err);
      });
      client.connect();
    });
  });

  it("successfully connects with valid token in authorization header", async () => {
    const client = Client(`http://localhost:${serverPort}`, {
      extraHeaders: {
        authorization: `Bearer ${analystToken}`
      },
      transports: ["websocket"],
      autoConnect: false
    });

    await new Promise((resolve, reject) => {
      client.on("connect", () => {
        expect(client.connected).toBe(true);
        client.close();
        resolve();
      });
      client.on("connect_error", (err) => {
        client.close();
        reject(err);
      });
      client.connect();
    });
  });

  it("emits incident:new with unmasked IPs for Admin and masked IPs for Analyst", async () => {
    const adminClient = Client(`http://localhost:${serverPort}`, {
      auth: { token: adminToken },
      transports: ["websocket"]
    });

    const analystClient = Client(`http://localhost:${serverPort}`, {
      auth: { token: analystToken },
      transports: ["websocket"]
    });

    await Promise.all([
      new Promise((resolve) => adminClient.on("connect", resolve)),
      new Promise((resolve) => analystClient.on("connect", resolve))
    ]);

    const mockIncident = {
      _id: "6afd938b1ef5736c71b7c999",
      source: "192.168.10.55",
      destination: "10.0.0.12",
      protocol: "TCP",
      mlClass: ATTACK_CLASSES.DOS_DDOS,
      confidence: 0.95,
      score: 95,
      riskLevel: RISK_LEVELS.CRITICAL
    };

    const [adminPayload, analystPayload] = await Promise.all([
      new Promise((resolve) => {
        adminClient.on("incident:new", (data) => resolve(data));
      }),
      new Promise((resolve) => {
        analystClient.on("incident:new", (data) => resolve(data));
      }),
      new Promise((resolve) => {
        // Small delay to ensure client joins room before broadcast
        setTimeout(() => {
          emitNewIncident(io, mockIncident);
          resolve();
        }, 50);
      })
    ]);

    // Admin receives original unmasked IP
    expect(adminPayload.source).toBe("192.168.10.55");
    expect(adminPayload.destination).toBe("10.0.0.12");

    // Analyst receives masked IP
    expect(analystPayload.source).toBe("192.168.10.xxx");
    expect(analystPayload.destination).toBe("10.0.0.xxx");

    adminClient.close();
    analystClient.close();
  });
});
