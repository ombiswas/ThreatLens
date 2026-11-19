import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "secret",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.secret"
    ],
    remove: true
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
