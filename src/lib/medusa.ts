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
export const MEDUSA_USE_PROXY =
  import.meta.env.PUBLIC_MEDUSA_USE_PROXY === "true";

function getStoreBaseUrl(): string {
  if (MEDUSA_USE_PROXY) return "/api/store";
  return MEDUSA_BACKEND_URL;
}

export interface MedusaProduct {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail: string | null;
  handle: string;
  discountable: boolean;
  status: string;
  metadata: Record<string, unknown> | null;
  variants: MedusaVariant[];
  images: { url: string }[];
  tags?: { value: string }[];
  collection?: { title: string } | null;
  categories?: { id: string; name: string; handle: string }[];
}

export interface MedusaVariant {
  id: string;
  title: string;
  sku: string | null;
  manage_inventory?: boolean;
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
    const usdRegion = regions.regions.find(
      (r: any) => r.currency_code === "usd"
    );
    _cachedRegionId = usdRegion?.id ?? regions.regions[0].id;
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
  const base = getStoreBaseUrl();
  if (!base) return null;

  const regionId = params?.region_id || await getDefaultRegionId();

  const url = new URL(`${base}${MEDUSA_USE_PROXY ? "/products" : "/store/products"}`, "https://example.invalid");
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));
  if (regionId) url.searchParams.set("region_id", regionId);
  if (params?.collection_id) {
    params.collection_id.forEach((id) => url.searchParams.append("collection_id[]", id));
  }
  url.searchParams.set(
    "fields",
    "*variants,*variants.calculated_price,*variants.manage_inventory,*images,*categories,metadata,subtitle"
  );

  try {
    const finalUrl = MEDUSA_USE_PROXY ? `${url.pathname}${url.search}` : url.toString().replace("https://example.invalid", "");
    const res = await fetch(finalUrl, { headers: defaultHeaders });
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
  const base = getStoreBaseUrl();
  if (!base) return null;

  const url = new URL(`${base}${MEDUSA_USE_PROXY ? "/products" : "/store/products"}`, "https://example.invalid");
  url.searchParams.set("handle", handle);
  url.searchParams.set(
    "fields",
    "*variants,*variants.calculated_price,*variants.manage_inventory,*images,*categories,metadata,subtitle"
  );

  try {
    const finalUrl = MEDUSA_USE_PROXY ? `${url.pathname}${url.search}` : url.toString().replace("https://example.invalid", "");
    const res = await fetch(finalUrl, { headers: defaultHeaders });
    if (!res.ok) return null;
    const data = await res.json() as MedusaProductsResponse;
    return data.products?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Parse numeric values from Medusa metadata (Collectr sync stores quantity / price_cents). */
function metaNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Convert a Medusa product to our internal ProductCard shape.
 * Prefer metadata from Collectr sync (price_cents, quantity) when set — variant
 * list prices and inventory_quantity can be stale or 0 when manage_inventory is false.
 */
export function medusaProductToCard(p: MedusaProduct) {
  const variant = p.variants?.[0];
  const meta = p.metadata ?? {};

  const metaPriceCents = metaNumber(meta.price_cents);
  const rawPrice = variant?.calculated_price?.calculated_amount ?? 0;
  const priceFromApi = rawPrice / 100;
  const price =
    metaPriceCents !== undefined && metaPriceCents >= 0
      ? metaPriceCents / 100
      : priceFromApi;

  const metaQty = metaNumber(meta.quantity);
  let stock: number;
  if (metaQty !== undefined && metaQty >= 0) {
    stock = Math.floor(metaQty);
  } else {
    const inv = Math.floor(variant?.inventory_quantity ?? 0);
    // Medusa often reports 0 when inventory is not managed; treat as sellable.
    if (variant?.manage_inventory === false && inv === 0) {
      stock = 1;
    } else {
      stock = inv;
    }
  }

  const image = p.thumbnail ?? p.images?.[0]?.url ?? "";

  const categoryHandle = p.categories?.[0]?.handle;
  const category = (meta.category as string)
    ?? categoryHandle
    ?? undefined;

  return {
    id: p.id,
    name: p.title,
    nameFr: (meta.name_fr as string) ?? p.title,
    price,
    image,
    stock,
    handle: p.handle,
    category,
    badge: (meta.badge as string) ?? undefined,
    grade: (meta.grade as string) ?? undefined,
    condition: (meta.condition as string) ?? undefined,
    rarity: (meta.rarity as string) ?? undefined,
    subtitle: p.subtitle ?? undefined,
    sku: variant?.sku ?? (meta.sku as string) ?? undefined,
  };
}

/** Fetch available regions */
export async function fetchMedusaRegions() {
  const base = getStoreBaseUrl();
  if (!base) return null;
  try {
    const url = MEDUSA_USE_PROXY ? "/api/store/regions" : `${base}/store/regions`;
    const res = await fetch(url, { headers: defaultHeaders });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
