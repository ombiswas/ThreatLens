import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { ROLES } from "../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [255, "Email cannot exceed 255 characters"]
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false // Never projected in queries by default
    },
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: "Invalid role specified"
      },
      default: ROLES.VIEWER,
      lowercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Checks whether user account is currently locked out due to repeated failed logins.
 * @returns {boolean} True if lockUntil is in the future.
 */
userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Compares candidate plaintext password against stored bcrypt hash.
 * @param {string} candidate - Plaintext password candidate.
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
