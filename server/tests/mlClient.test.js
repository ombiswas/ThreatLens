import { describe, it, expect, vi } from "vitest";
import { MLClient } from "../src/services/mlClient.js";
import { ServiceUnavailableError, AppError } from "../src/errors/AppError.js";

describe("ML Microservice Client (mlClient)", () => {
  const dummyFlow = { "Destination Port": 80, "Flow Duration": 1000 };

  it("successfully queries /predict and passes X-API-Key header", async () => {
    const mockResponse = {
      predicted_class: "DoS/DDoS",
      confidence: 0.98,
      probabilities: { "DoS/DDoS": 0.98, Benign: 0.02 }
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });

    const client = new MLClient({
      baseUrl: "http://localhost:8000",
      apiKey: "secret-test-key",
      fetchFn: mockFetch
    });

    const result = await client.predictSingle(dummyFlow);
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://localhost:8000/predict");
    expect(calledInit.headers["X-API-Key"]).toBe("secret-test-key");
    expect(calledInit.headers["Content-Type"]).toBe("application/json");
  });

  it("handles 401 Unauthorized by throwing ServiceUnavailableError without retrying or leaking key", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid API Key" })
    });

    const client = new MLClient({
      baseUrl: "http://internal-ml:8000",
      apiKey: "super-secret-key-12345",
      maxRetries: 3,
      fetchFn: mockFetch
    });

    await expect(client.predictSingle(dummyFlow)).rejects.toThrow(ServiceUnavailableError);
    // Should NOT retry on 401
    expect(mockFetch).toHaveBeenCalledTimes(1);

    try {
      await client.predictSingle(dummyFlow);
    } catch (err) {
      expect(err.statusCode).toBe(503);
      expect(err.message).not.toContain("super-secret-key-12345");
      expect(err.message).not.toContain("internal-ml:8000");
    }
  });

  it("retries on 500 Server Error up to maxRetries before failing with 503", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Internal ML error" })
    });

    const client = new MLClient({
      baseUrl: "http://localhost:8000",
      apiKey: "key",
      maxRetries: 3,
      fetchFn: mockFetch
    });

    await expect(client.predictSingle(dummyFlow)).rejects.toThrow(ServiceUnavailableError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries on network timeout/abort and fails with 503", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection reset by peer"));

    const client = new MLClient({
      baseUrl: "http://localhost:8000",
      apiKey: "key",
      maxRetries: 2,
      fetchFn: mockFetch
    });

    await expect(client.predictSingle(dummyFlow)).rejects.toThrow(ServiceUnavailableError);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles client 400 Bad Request by throwing operational AppError without retrying", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Malformed feature vector" })
    });

    const client = new MLClient({
      baseUrl: "http://localhost:8000",
      apiKey: "key",
      maxRetries: 3,
      fetchFn: mockFetch
    });

    await expect(client.predictSingle(dummyFlow)).rejects.toThrow(AppError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("queries /predict/batch and /model-info endpoints", async () => {
    const batchMock = { count: 1, predictions: [{ predicted_class: "Benign", confidence: 0.99 }] };
    const modelInfoMock = { model_name: "RF", version: "1.0" };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => batchMock
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => modelInfoMock
      });

    const client = new MLClient({
      baseUrl: "http://localhost:8000",
      apiKey: "key",
      fetchFn: mockFetch
    });

    const batchRes = await client.predictBatch([dummyFlow]);
    expect(batchRes).toEqual(batchMock);

    const infoRes = await client.getModelInfo();
    expect(infoRes).toEqual(modelInfoMock);
  });
});
