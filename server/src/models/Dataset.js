import mongoose from "mongoose";

const datasetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Dataset name is required"],
      trim: true,
      maxlength: [100, "Dataset name cannot exceed 100 characters"]
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    rowCount: {
      type: Number,
      default: 0
    },
    benignCount: {
      type: Number,
      default: 0
    },
    incidentCount: {
      type: Number,
      default: 0
    },
    classDistribution: {
      type: Map,
      of: Number,
      default: {}
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    rejectedRows: [
      {
        rowNumber: { type: Number, required: true },
        reason: { type: String, required: true }
      }
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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

export const Dataset = mongoose.model("Dataset", datasetSchema);
