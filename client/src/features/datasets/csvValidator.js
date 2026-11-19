import { FEATURE_NAMES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "../../utils/constants.js";

const FEATURE_SET = new Set(FEATURE_NAMES);

/**
 * Validates a CSV file on the client before network upload.
 * Mirrors server-side validation rules in datasetService.js.
 *
 * @param {File} file - Browser File object
 * @returns {Promise<{ valid: boolean, error?: string, missingFeatures?: string[], headerCount?: number, headers?: string[] }>}
 */
export async function validateDatasetCsv(file) {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  // 1. Extension check
  const fileName = file.name || "";
  if (!fileName.toLowerCase().endsWith(".csv")) {
    return {
      valid: false,
      error: `Invalid file extension. Expected '.csv', received: '${fileName.substring(fileName.lastIndexOf(".")) || "none"}'.`
    };
  }

  // 2. File size check (5MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds the 5 MB limit. Selected file size: ${sizeMb} MB.`
    };
  }

  // 3. MIME type check (when provided by browser)
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid MIME type '${file.type}'. Expected 'text/csv'.`
    };
  }

  // 4. Header and content check (read first chunk)
  try {
    const slice = file.slice(0, 65536);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check for DOS PE ("MZ" = 0x4d 0x5a) or Linux ELF (0x7f 'E' 'L' 'F')
    if (
      (bytes[0] === 0x4d && bytes[1] === 0x5a) ||
      (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46)
    ) {
      return {
        valid: false,
        error: "Executable or binary file detected. Only plaintext CSV files are accepted."
      };
    }

    // Check for null bytes
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0x00) {
        return {
          valid: false,
          error: "Binary data or null bytes detected in file content."
        };
      }
    }

    // Decode header line
    const textChunk = new TextDecoder("utf-8").decode(bytes);
    const firstLine = textChunk.split(/\r?\n/)[0];

    if (!firstLine || !firstLine.includes(",")) {
      return {
        valid: false,
        error: "Malformed CSV: no comma-separated header row detected on first line."
      };
    }

    // Parse header tokens
    const rawHeaders = firstLine
      .split(",")
      .map((h) => h.replace(/^["'\s]+|["'\s]+$/g, "").trim())
      .filter(Boolean);

    const headerSet = new Set(rawHeaders);
    const missingFeatures = [];

    for (const feat of FEATURE_NAMES) {
      if (!headerSet.has(feat)) {
        missingFeatures.push(feat);
      }
    }

    if (missingFeatures.length > 0) {
      return {
        valid: false,
        error: `CSV header is missing ${missingFeatures.length} required CIC-IDS2017 features.`,
        missingFeatures: missingFeatures.slice(0, 5),
        headerCount: rawHeaders.length,
        headers: rawHeaders
      };
    }

    return {
      valid: true,
      headerCount: rawHeaders.length,
      headers: rawHeaders
    };
  } catch (err) {
    return {
      valid: false,
      error: `Error reading file: ${err.message || "Unknown file read error"}`
    };
  }
}
