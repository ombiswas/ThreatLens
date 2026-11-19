import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.resolve(__dirname, "../docs/openapi.json");

let openapiSpec = null;
try {
  openapiSpec = JSON.parse(fs.readFileSync(openapiPath, "utf8"));
} catch (err) {
  console.error("Failed to load OpenAPI specification:", err.message);
}

/**
 * Returns raw OpenAPI 3.0 specification as JSON.
 */
router.get("/openapi.json", (req, res) => {
  if (!openapiSpec) {
    return res.status(500).json({ error: "OpenAPI spec unavailable" });
  }
  res.json(openapiSpec);
});

/**
 * Renders Swagger UI.
 * In production mode, Swagger UI is gated behind admin authentication or disabled to prevent reconnaissance.
 */
router.get("/", (req, res) => {
  // If in production and not authenticated as admin, deny access
  if (process.env.NODE_ENV === "production" && req.user?.role !== "admin") {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Interactive API documentation is restricted to administrators in production"
      }
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI CyberShield API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background-color: #0f172a; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        deepLinking: true
      });
    };
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
