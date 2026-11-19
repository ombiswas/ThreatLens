import mongoose from "mongoose";
import { ATTACK_CLASSES, RISK_LEVELS, INCIDENT_STATUSES } from "../utils/constants.js";

const noteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    authorName: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"]
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const incidentSchema = new mongoose.Schema(
  {
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    source: {
      type: String,
      default: "192.168.1.xxx",
      trim: true
    },
    destination: {
      type: String,
      default: "10.0.0.1",
      trim: true
    },
    protocol: {
      type: String,
      default: "TCP",
      trim: true
    },
    mlClass: {
      type: String,
      required: true,
      enum: Object.values(ATTACK_CLASSES),
      index: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    baselineClass: {
      type: String,
      required: true,
      enum: Object.values(ATTACK_CLASSES)
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true
    },
    riskLevel: {
      type: String,
      required: true,
      enum: Object.values(RISK_LEVELS),
      index: true
    },
    explanation: [
      {
        factor: { type: String, required: true },
        description: { type: String, default: "" },
        contribution: { type: Number, required: true }
      }
    ],
    status: {
      type: String,
      required: true,
      enum: Object.values(INCIDENT_STATUSES),
      default: INCIDENT_STATUSES.NEW,
      index: true
    },
    notes: [noteSchema],
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      default: null,
      index: true
    },
    groundTruthLabel: {
      type: String,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound indexes for performant SOC dashboard queries
incidentSchema.index({ status: 1, riskLevel: 1, detectedAt: -1 });
incidentSchema.index({ datasetId: 1, detectedAt: -1 });
incidentSchema.index({ riskLevel: 1, detectedAt: -1 });
incidentSchema.index({ mlClass: 1, detectedAt: -1 });

export const Incident = mongoose.model("Incident", incidentSchema);
