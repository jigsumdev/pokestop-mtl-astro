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
  import.meta.env.PUBLIC_MEDUSA_BACKEND_URL || "";
export const MEDUSA_PUBLISHABLE_KEY =
  import.meta.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

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

let _cachedRegionId: string | null = null;

async function getDefaultRegionId(): Promise<string | null> {
  if (_cachedRegionId) return _cachedRegionId;
  const regions = await fetchMedusaRegions();
  if (regions?.regions?.length) {
    _cachedRegionId = regions.regions[0].id;
    return _cachedRegionId;
  }
  return null;
}

/** Fetch products from Medusa v2 storefront API */
export async function fetchMedusaProducts(params?: {
  limit?: number;
  offset?: number;
  collection_id?: string[];
  tags?: string[];
  region_id?: string;
}): Promise<MedusaProductsResponse | null> {
  if (!MEDUSA_BACKEND_URL) return null;

  const regionId = params?.region_id || await getDefaultRegionId();

  const url = new URL(`${MEDUSA_BACKEND_URL}/store/products`);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));
  if (regionId) url.searchParams.set("region_id", regionId);
  if (params?.collection_id) {
    params.collection_id.forEach((id) => url.searchParams.append("collection_id[]", id));
  }
  url.searchParams.set("fields", "*variants,*variants.calculated_price,*images,*tags,*collection");

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
  url.searchParams.set("fields", "*variants,*images,*tags,*collection");

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
