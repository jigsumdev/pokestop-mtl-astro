import { BODY_LIMIT_BYTES, MAX_PATH_LENGTH } from "./constants.js";
import { HttpError } from "./errors.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getBodyByteLength(value) {
  return new TextEncoder().encode(value).length;
}

export async function readJsonBody(request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsedLength) && parsedLength > BODY_LIMIT_BYTES) {
      throw new HttpError(400, "Request body must be 10 KB or less.");
    }
  }

  const rawBody = await request.text();
  if (getBodyByteLength(rawBody) > BODY_LIMIT_BYTES) {
    throw new HttpError(400, "Request body must be 10 KB or less.");
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }

  if (!isPlainObject(parsedBody)) {
    throw new HttpError(400, "JSON body must be an object.");
  }

  return parsedBody;
}

export function validateRelativePath(value, fieldName, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpError(400, `${fieldName} is required.`);
    }
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized && required) {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  if (normalized.length > MAX_PATH_LENGTH) {
    throw new HttpError(
      400,
      `${fieldName} must be ${MAX_PATH_LENGTH} characters or fewer.`
    );
  }

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    throw new HttpError(400, `${fieldName} must be a relative site path.`);
  }

  return normalized;
}

