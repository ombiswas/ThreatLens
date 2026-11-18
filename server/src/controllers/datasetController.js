import {
  processDatasetUpload,
  getDatasets,
  getDatasetById,
  deleteDataset
} from "../services/datasetService.js";
import { datasetUploadSchema } from "../validators/datasetValidators.js";
import { ValidationError } from "../errors/AppError.js";

export async function uploadDatasetHandler(req, res) {
  if (!req.file) {
    throw new ValidationError("Dataset CSV file is required in 'file' multipart field");
  }

  const parseResult = datasetUploadSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError(
      "Invalid dataset upload parameters",
      parseResult.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  }

  const name =
    parseResult.data.name ||
    req.file.originalname.replace(/\.csv$/i, "").trim() ||
    "Uploaded Dataset";

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const dataset = await processDatasetUpload({
    name,
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    user: req.user,
    ip,
    userAgent
  });

  res.status(201).json({
    status: "success",
    data: { dataset }
  });
}

export async function getDatasetsHandler(req, res) {
  const result = await getDatasets({
    page: req.query.page,
    limit: req.query.limit
  });

  res.status(200).json({
    status: "success",
    data: result
  });
}

export async function getDatasetByIdHandler(req, res) {
  const dataset = await getDatasetById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { dataset }
  });
}

export async function deleteDatasetHandler(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const result = await deleteDataset(req.params.id, req.user, ip, userAgent);

  res.status(200).json({
    status: "success",
    data: result
  });
}
