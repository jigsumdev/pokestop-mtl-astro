import { HttpError } from "./errors.js";

function parseAllowedOrigins(env, requestUrl) {
  const allowed = new Set([requestUrl.origin]);

  const extra = env?.ALLOWED_ORIGINS;
  if (typeof extra === "string" && extra.trim() !== "") {
    for (const raw of extra.split(",")) {
      const candidate = raw.trim();
      if (!candidate) continue;
      try {
        const origin = new URL(candidate).origin;
        allowed.add(origin);
      } catch {
        console.warn("Ignoring invalid origin in ALLOWED_ORIGINS:", candidate);
      }
    }
  }

  return allowed;
}

export function assertAllowedPostOrigin(request, env) {
  if (request.method !== "POST") {
    return;
  }

  const originHeader = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const allowedOrigins = parseAllowedOrigins(env, requestUrl);

  if (!originHeader) {
    throw new HttpError(403, "Forbidden.");
  }

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(originHeader).origin;
  } catch {
    throw new HttpError(403, "Forbidden.");
  }

  if (!allowedOrigins.has(normalizedOrigin)) {
    throw new HttpError(403, "Forbidden.");
  }
}

