/*
  medusa.ts — PokéStop MTL
  Medusa v2 storefront API client
  Uses the Medusa JS SDK (or raw fetch) to talk to the backend.

  Environment variables:
    PUBLIC_MEDUSA_BACKEND_URL  — e.g. https://your-medusa.railway.app
    PUBLIC_MEDUSA_PUBLISHABLE_KEY — from Medusa admin > Settings > API Keys

  When the backend is unreachable, the shop falls back to the static products.ts catalog.
*/

export const MEDUSA_BACKEND_URL =
  import.meta.env.PUBLIC_MEDUSA_BACKEND_URL ?? "";
export const MEDUSA_PUBLISHABLE_KEY =
  import.meta.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

export interface MedusaProduct {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  handle: string;
  variants: MedusaVariant[];
  images: { url: string }[];
  tags?: { value: string }[];
  collection?: { title: string } | null;
}

export interface MedusaVariant {
  id: string;
  title: string;
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
  inventory_quantity: number;
}

export interface MedusaProductsResponse {
  products: MedusaProduct[];
  count: number;
  offset: number;
  limit: number;
}

const defaultHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

if (MEDUSA_PUBLISHABLE_KEY) {
  defaultHeaders["x-publishable-api-key"] = MEDUSA_PUBLISHABLE_KEY;
}

/** Fetch products from Medusa storefront API */
export async function fetchMedusaProducts(params?: {
  limit?: number;
  offset?: number;
  collection_id?: string[];
  tags?: string[];
  region_id?: string;
}): Promise<MedusaProductsResponse | null> {
  if (!MEDUSA_BACKEND_URL) return null;

  const url = new URL(`${MEDUSA_BACKEND_URL}/store/products`);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));
  if (params?.region_id) url.searchParams.set("region_id", params.region_id);
  if (params?.collection_id) {
    params.collection_id.forEach((id) => url.searchParams.append("collection_id[]", id));
  }
  // Expand variants with pricing
  url.searchParams.set("expand", "variants,variants.prices,images,collection,tags");
  url.searchParams.set("fields", "id,title,description,thumbnail,handle,variants,images,tags,collection");

  try {
    const res = await fetch(url.toString(), { headers: defaultHeaders });
    if (!res.ok) {
      console.error(`[Medusa] Products fetch failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json() as Promise<MedusaProductsResponse>;
  } catch (err) {
    console.error("[Medusa] Network error fetching products:", err);
    return null;
  }
}

/** Fetch a single product by handle */
export async function fetchMedusaProduct(handle: string): Promise<MedusaProduct | null> {
  if (!MEDUSA_BACKEND_URL) return null;

  const url = new URL(`${MEDUSA_BACKEND_URL}/store/products`);
  url.searchParams.set("handle", handle);
  url.searchParams.set("expand", "variants,variants.prices,images,collection,tags");

  try {
    const res = await fetch(url.toString(), { headers: defaultHeaders });
    if (!res.ok) return null;
    const data = await res.json() as MedusaProductsResponse;
    return data.products?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Convert a Medusa product to our internal ProductCard shape */
export function medusaProductToCard(p: MedusaProduct) {
  const variant = p.variants?.[0];
  const price = variant?.calculated_price?.calculated_amount ?? 0;
  const stock = variant?.inventory_quantity ?? 0;
  const image = p.thumbnail ?? p.images?.[0]?.url ?? "";

  return {
    id: p.id,
    name: p.title,
    price,
    image,
    stock,
    handle: p.handle,
  };
}

/** Fetch available regions */
export async function fetchMedusaRegions() {
  if (!MEDUSA_BACKEND_URL) return null;
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/regions`, { headers: defaultHeaders });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
