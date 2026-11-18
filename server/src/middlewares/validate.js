import { ValidationError } from "../errors/AppError.js";

/**
 * Validates request components (body, params, query) using a Zod schema.
 * Rejects unknown extra properties strictly if supported by the schema.
 * @param {Object} schemas Object with optional body, params, query Zod schemas
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params =
          typeof schemas.params.strict === "function"
            ? schemas.params.strict().parse(req.params)
            : schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query =
          typeof schemas.query.strict === "function"
            ? schemas.query.strict().parse(req.query)
            : schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body =
          typeof schemas.body.strict === "function"
            ? schemas.body.strict().parse(req.body)
            : schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err.errors) {
        const details = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message
        }));
        return next(new ValidationError("Request validation failed", details));
      }
      next(err);
    }
  };
}

/**
 * Checks if an object contains keys starting with '$' or containing dots '.'.
 * Prevents NoSQL operator injection and unauthorized selector mutation.
 * @param {any} target Object or primitive to inspect
 * @returns {boolean} True if malicious key pattern detected
 */
function containsNoSqlKeys(target) {
  if (!target || typeof target !== "object") {
    return false;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith("$") || key.includes(".")) {
      return true;
    }
    if (typeof target[key] === "object" && containsNoSqlKeys(target[key])) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware protecting against NoSQL operator injection across body, params, and query.
 */
export function nosqlSanitizer(req, res, next) {
  if (
    containsNoSqlKeys(req.body) ||
    containsNoSqlKeys(req.query) ||
    containsNoSqlKeys(req.params)
  ) {
    return next(
      new ValidationError(
        "Invalid characters in request payload: keys containing '$' or '.' are forbidden"
      )
    );
  }
  next();
}
