import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

/**
 * Connects to MongoDB Atlas / Local MongoDB instance with connection telemetry.
 * @param {string} uri MongoDB connection string
 */
export async function connectDB(uri) {
  try {
    mongoose.connection.on("connected", () => {
      logger.info({ msg: "MongoDB connection established successfully" });
    });

    mongoose.connection.on("error", (err) => {
      logger.error({ msg: "MongoDB connection error", error: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn({ msg: "MongoDB disconnected" });
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== "production"
    });
  } catch (err) {
    logger.fatal({ msg: "Failed to connect to MongoDB", error: err.message });
    throw err;
  }
}

/**
 * Gracefully disconnects from MongoDB during service termination.
 */
export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    logger.info({ msg: "MongoDB connection closed gracefully" });
  } catch (err) {
    logger.error({ msg: "Error closing MongoDB connection", error: err.message });
  }
}
