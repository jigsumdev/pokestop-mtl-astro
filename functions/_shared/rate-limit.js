import {
  RATE_LIMIT_ERROR_MESSAGE,
  RATE_LIMIT_WINDOW_SECONDS,
} from "./constants.js";
import { HttpError } from "./errors.js";

const missingBindingWarnings = new Set();

export async function enforceRateLimit(request, rateLimiter, bindingName) {
  if (!rateLimiter || typeof rateLimiter.limit !== "function") {
    if (!missingBindingWarnings.has(bindingName)) {
      missingBindingWarnings.add(bindingName);
      console.warn(
        `${bindingName} rate limit binding is not configured. Skipping application-level rate limiting.`
      );
    }
    return;
  }

  const url = new URL(request.url);
  const ipAddress = request.headers.get("cf-connecting-ip") || "unknown";
  const outcome = await rateLimiter.limit({
    key: `${url.pathname}:${ipAddress}`,
  });

  if (!outcome?.success) {
    throw new HttpError(429, RATE_LIMIT_ERROR_MESSAGE, {
      "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS),
    });
  }
}

