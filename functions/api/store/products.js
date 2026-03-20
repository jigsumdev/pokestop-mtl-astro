import { errorResponse, jsonResponse, methodNotAllowed } from "../../_shared/http.js";
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
    const url = new URL(request.url);
    const upstream = new URL(`${backend}/store/products`);

    // Whitelist a few known query params from the frontend
    for (const key of ["limit", "offset", "region_id", "handle", "fields"]) {
      const v = url.searchParams.get(key);
      if (v) upstream.searchParams.set(key, v);
    }

    // Support repeating `collection_id[]` params
    for (const v of url.searchParams.getAll("collection_id[]")) {
      upstream.searchParams.append("collection_id[]", v);
    }

    const res = await fetch(upstream.toString(), {
      headers: buildHeaders(env),
      cf: {
        cacheTtl: 60,
        cacheEverything: true,
      },
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[PagesFunction][MedusaProxy] /store/products failed", res.status, text);
      return errorResponse("Upstream error fetching products.", 502);
    }

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.status, error.headers);
    }
    console.error("[PagesFunction][MedusaProxy] Unexpected error", error);
    return jsonResponse({ error: "Internal error." }, 500);
  }
}

