import multer from "multer";
import { ValidationError } from "../errors/AppError.js";

// Memory storage keeps uploads in memory buffers for safe streaming inspection
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/csv",
  "text/x-csv"
]);

export const uploadCsv = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB hard limit
  },
  fileFilter: (_req, file, cb) => {
    const originalName = file.originalname || "";
    if (!originalName.toLowerCase().endsWith(".csv")) {
      return cb(new ValidationError("Only CSV files with a .csv extension are allowed"), false);
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return cb(
        new ValidationError(`Invalid MIME type '${file.mimetype}': expected text/csv`),
        false
      );
    }

    cb(null, true);
  }
});
