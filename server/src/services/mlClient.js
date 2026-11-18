import { env } from "../config/env.js";
import { ServiceUnavailableError, AppError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 150;

/**
 * Delays execution for specified milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Internal HTTP client for ML Microservice integration.
 * Injects X-API-Key, handles cold-start retries, and protects credentials.
 */
export class MLClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || env.ML_SERVICE_URL).replace(/\/$/, "");
    this.apiKey = options.apiKey || env.ML_API_KEY;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  /**
   * Executes HTTP request with retry with exponential backoff on transient network and 5xx errors.
   *
   * @param {string} endpoint - Path (e.g. "/predict")
   * @param {object} [options] - Fetch options
   * @returns {Promise<any>}
   * @private
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      attempt += 1;
      const controller = new globalThis.AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchFn(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey,
            ...(options.headers || {})
          }
        });

        clearTimeout(timer);

        // 401 Unauthorized from ML service -> Misconfiguration; do not retry
        if (response.status === 401) {
          logger.error({ msg: "ML microservice rejected internal API key" });
          const authError = new ServiceUnavailableError(
            "ML inference service authentication failed"
          );
          authError.isAuthError = true;
          throw authError;
        }

        // 5xx Server Error -> Transient / cold-start error; eligible for retry
        if (response.status >= 500) {
          lastError = new ServiceUnavailableError(
            "ML inference service encountered an internal error"
          );
          if (attempt < this.maxRetries) {
            await wait(INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
            continue;
          }
          throw lastError;
        }

        // 4xx Client Error -> Bad request / payload error; do not retry
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.detail || "ML inference service rejected payload";
          throw new AppError(message, response.status, "ML_INFERENCE_ERROR");
        }

        return await response.json();
      } catch (err) {
        clearTimeout(timer);

        // Bubble up operational client errors or non-retriable auth errors
        if (err.isAuthError || (err instanceof AppError && err.statusCode < 500)) {
          throw err;
        }

        lastError = err;

        // Retry on network errors or timeouts if attempts remain
        if (attempt < this.maxRetries) {
          logger.warn({
            msg: `ML service request to ${endpoint} failed (attempt ${attempt}/${this.maxRetries}); retrying...`
          });
          await wait(INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
        }
      }
    }

    // All retries exhausted -> Return 503 without leaking keys or internal URLs
    logger.error({
      msg: `ML service unavailable after ${this.maxRetries} attempts`,
      endpoint
    });
    throw new ServiceUnavailableError("ML detection service is temporarily unavailable");
  }

  /**
   * Classifies a single network flow record.
   *
   * @param {object} flow - Key-value feature mapping
   * @returns {Promise<{ predicted_class: string, confidence: number, probabilities: object }>}
   */
  async predictSingle(flow) {
    return this._request("/predict", {
      method: "POST",
      body: JSON.stringify({ flow })
    });
  }

  /**
   * Classifies a batch of network flow records.
   *
   * @param {Array<object>} flows - List of flow feature records
   * @returns {Promise<{ count: number, predictions: Array<object> }>}
   */
  async predictBatch(flows) {
    return this._request("/predict/batch", {
      method: "POST",
      body: JSON.stringify({ flows })
    });
  }

  /**
   * Retrieves active model architecture, version, features, and metrics.
   *
   * @returns {Promise<object>}
   */
  async getModelInfo() {
    return this._request("/model-info", {
      method: "GET"
    });
  }
}

export const mlClient = new MLClient();
