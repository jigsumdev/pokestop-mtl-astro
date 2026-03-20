import {
  RATE_LIMIT_ERROR_MESSAGE,
  RATE_LIMIT_WINDOW_SECONDS,
} from "./constants.js";
import { HttpError } from "./errors.js";

export const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
};

export function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}

export function errorResponse(message, status, headers = {}) {
  return jsonResponse({ error: message }, status, headers);
}

export function methodNotAllowed(allowedMethods = ["POST"]) {
  return errorResponse("Method Not Allowed.", 405, {
    Allow: allowedMethods.join(", "),
  });
}

export function tooManyRequestsResponse() {
  return errorResponse(RATE_LIMIT_ERROR_MESSAGE, 429, {
    "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS),
  });
}

export function responseFromError(error, fallbackMessage) {
  if (error instanceof HttpError) {
    if (error.status === 429) {
      return tooManyRequestsResponse();
    }
    return errorResponse(error.message, error.status, error.headers);
  }

  return errorResponse(fallbackMessage, 500);
}

