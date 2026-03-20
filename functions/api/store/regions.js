import { errorResponse, methodNotAllowed } from "../../_shared/http.js";
import { HttpError } from "../../_shared/errors.js";

function getBackend(env) {
  const url = env?.PUBLIC_MEDUSA_BACKEND_URL;
  if (typeof url !== "string" || url.trim() === "") {
    throw new HttpError(
      500,
      "PUBLIC_MEDUSA_BACKEND_URL is not configured for Pages Functions."
    );
  }
  return url.replace(/\/+$/, "");
}

function buildHeaders(env) {
  const headers = {
    Accept: "application/json",
  };
  const key = env?.PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  if (typeof key === "string" && key.trim() !== "") {
    headers["x-publishable-api-key"] = key;
  }
  return headers;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    const backend = getBackend(env);
    const upstream = `${backend}/store/regions`;
    const res = await fetch(upstream, {
      headers: buildHeaders(env),
      cf: {
        cacheTtl: 300,
        cacheEverything: true,
      },
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[PagesFunction][MedusaProxy] /store/regions failed", res.status, text);
      return errorResponse("Upstream error fetching regions.", 502);
    }

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.status, error.headers);
    }
    console.error("[PagesFunction][MedusaProxy] Unexpected error", error);
    return errorResponse("Internal error.", 500);
  }
}

