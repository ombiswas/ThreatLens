import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";

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

describe("Server Infrastructure & Health Endpoints", () => {
  it("GET /api/health returns 200 with uptime and database status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.database).toBe("connected");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("GET /api/ready returns 200 when database is connected", async () => {
    const res = await request(app).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.database).toBe("connected");
  });

  it("Undefined route returns standard 404 error envelope", async () => {
    const res = await request(app).get("/api/undefined-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(res.body.error.message).toContain("Cannot GET /api/undefined-endpoint");
  });

  it("Malformed JSON body returns 400 with safe error code", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ invalid_json: ");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("NoSQL injection with '$' operator is rejected", async () => {
    const res = await request(app).post("/api/health").send({ $where: "sleep(5000)" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("keys containing '$' or '.' are forbidden");
  });

  it("Security headers from Helmet are present", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("CORS blocks disallowed Origin header", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://malicious-attacker.com");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("CORS permits allowed CLIENT_URL Origin", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://localhost:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
