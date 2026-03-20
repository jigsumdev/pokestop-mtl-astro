import { createMedusaAdminClient } from "../../../src/lib/medusa-admin-client";
import { syncCollectrToMedusa } from "../../../src/lib/sync-collectr-to-medusa";
import { HttpError } from "../../_shared/errors";
import { assertAllowedPostOrigin } from "../../_shared/origin";
import { enforceRateLimit } from "../../_shared/rate-limit";
import { errorResponse, jsonResponse, methodNotAllowed } from "../../_shared/http";
import { readJsonBody } from "../../_shared/validation";

function requireAdminToken(request: Request, env: any) {
  const expected = env?.ADMIN_SYNC_TOKEN;
  if (typeof expected !== "string" || expected.trim() === "") {
    throw new HttpError(500, "ADMIN_SYNC_TOKEN is not configured.");
  }
  const provided = request.headers.get("x-admin-token") || "";
  if (provided !== expected) {
    throw new HttpError(401, "Unauthorized.");
  }
}

function getAdminAuth(env: any) {
  const backendUrl = env?.PUBLIC_MEDUSA_BACKEND_URL;
  const email = env?.MEDUSA_ADMIN_EMAIL;
  const password = env?.MEDUSA_ADMIN_PASSWORD;

  if (typeof backendUrl !== "string" || backendUrl.trim() === "") {
    throw new HttpError(500, "PUBLIC_MEDUSA_BACKEND_URL is not configured.");
  }
  if (typeof email !== "string" || email.trim() === "") {
    throw new HttpError(500, "MEDUSA_ADMIN_EMAIL is not configured.");
  }
  if (typeof password !== "string" || password.trim() === "") {
    throw new HttpError(500, "MEDUSA_ADMIN_PASSWORD is not configured.");
  }

  return { backendUrl, email, password };
}

export async function onRequest(context: any) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  try {
    assertAllowedPostOrigin(request, env);
    requireAdminToken(request, env);

    await enforceRateLimit(request, env?.SYNC_RATE_LIMITER, "SYNC_RATE_LIMITER");

    const body = await readJsonBody(request);
    const dryRun = body?.dryRun === true;
    const portfolio = body?.portfolio;

    if (!Array.isArray(portfolio) || portfolio.length === 0) {
      return errorResponse("portfolio must be a non-empty array.", 400);
    }

    const auth = getAdminAuth(env);
    const client = createMedusaAdminClient(auth);
    const stats = await syncCollectrToMedusa(client, { portfolio, dryRun });

    return jsonResponse({ ok: true, stats }, 200);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.status, error.headers);
    }
    console.error("[PagesFunction][sync-collectr] unexpected error", error);
    return errorResponse("Internal error.", 500);
  }
}

