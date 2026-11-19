import mongoose from "mongoose";
import { AUDIT_ACTIONS } from "../utils/constants.js";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_ACTIONS),
      index: true
    },
    ip: {
      type: String,
      required: true,
      trim: true
    },
    userAgent: {
      type: String,
      default: "unknown",
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Retention policy TTL index: auto-expire audit logs after 90 days (7,776,000 seconds)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Compound index for filtering audit logs by action and sorting chronologically
auditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
