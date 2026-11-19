import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { Incident } from "../models/Incident.js";
import { Dataset } from "../models/Dataset.js";
import { AuditLog } from "../models/AuditLog.js";
import { Notification } from "../models/Notification.js";
import { logger } from "../utils/logger.js";

// Load environment variables if running outside preloaded environment
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("CRITICAL: MONGO_URI environment variable is required to build production indexes.");
  process.exit(1);
}

const models = [
  { name: "User", model: User },
  { name: "Incident", model: Incident },
  { name: "Dataset", model: Dataset },
  { name: "AuditLog", model: AuditLog },
  { name: "Notification", model: Notification }
];

async function ensureProductionIndexes() {
  console.log("Connecting to MongoDB Atlas to synchronize production indexes...");
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  });

  console.log("MongoDB connection established. Synchronizing schema indexes...");

  for (const { name, model } of models) {
    try {
      console.log(`Processing indexes for collection: ${model.collection.name} (${name})...`);
      await model.createIndexes();
      const indexes = await model.collection.indexes();
      console.log(`  ✓ ${name} indexes synchronized (${indexes.length} active):`);
      indexes.forEach((idx) => {
        console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
    } catch (err) {
      console.error(`  ✗ Failed to synchronize indexes for ${name}:`, err.message);
      throw err;
    }
  }

  console.log("All collection indexes verified successfully.");
}

ensureProductionIndexes()
  .then(async () => {
    await mongoose.disconnect();
    console.log("MongoDB disconnected. Index provisioning complete.");
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ msg: "Error ensuring indexes", error: err.message });
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
