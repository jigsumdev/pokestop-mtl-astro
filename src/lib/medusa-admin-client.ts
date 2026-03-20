export type MedusaAdminAuth = {
  backendUrl: string;
  email: string;
  password: string;
};

export type AdminProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  thumbnail: string | null;
  metadata: Record<string, unknown> | null;
  variants?: AdminVariant[];
  images?: { id: string; url: string }[];
  categories?: { id: string; name: string; handle: string }[];
};

export type AdminVariant = {
  id: string;
  title: string;
  sku: string | null;
  prices?: { id: string; amount: number; currency_code: string }[];
  inventory_quantity?: number;
};

export type AdminCategory = {
  id: string;
  name: string;
  handle: string;
  is_active: boolean;
};

export type AdminRegion = { id: string; currency_code: string; name: string };
export type AdminSalesChannel = { id: string; name: string };

export type AdminInventoryItem = {
  id: string;
  sku: string | null;
  title: string;
  description: string | null;
};

export function createMedusaAdminClient(auth: MedusaAdminAuth) {
  const backend = auth.backendUrl.replace(/\/+$/, "");
  let token: string | null = null;

  async function authenticate(): Promise<string> {
    if (!auth.email || !auth.password) {
      throw new Error("MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD must be set");
    }
    const res = await fetch(`${backend}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: auth.email, password: auth.password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Auth failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as { token: string };
    return data.token;
  }

  async function adminFetch(path: string, opts: RequestInit = {}): Promise<Response> {
    if (!token) {
      token = await authenticate();
    }
    const url = `${backend}${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...((opts.headers as Record<string, string>) ?? {}),
      },
    });
    if (res.status === 401) {
      token = await authenticate();
      return fetch(url, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...((opts.headers as Record<string, string>) ?? {}),
        },
      });
    }
    return res;
  }

  return {
    authenticate: async () => {
      token = await authenticate();
      return token;
    },

    updateVariant: async (id: string, body: Record<string, unknown>) => {
      const res = await adminFetch(`/admin/product-variants/${id}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`updateVariant ${id} failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { product_variant: AdminVariant };
      return data.product_variant;
    },

    listProducts: async (params?: { handle?: string; limit?: number; offset?: number }) => {
      const url = new URL(`${backend}/admin/products`);
      if (params?.handle) url.searchParams.set("handle", params.handle);
      url.searchParams.set("limit", String(params?.limit ?? 100));
      if (params?.offset) url.searchParams.set("offset", String(params.offset));
      url.searchParams.set(
        "fields",
        "id,title,handle,status,thumbnail,metadata,*variants,*variants.prices,*images,*categories"
      );

      const res = await adminFetch(url.pathname + url.search);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`listProducts failed (${res.status}): ${text}`);
      }
      return (await res.json()) as { products: AdminProduct[]; count: number };
    },

    findProductByHandle: async (handle: string) => {
      const data = await (async () => {
        const url = new URL(`${backend}/admin/products`);
        url.searchParams.set("handle", handle);
        url.searchParams.set("limit", "1");
        url.searchParams.set(
          "fields",
          "id,title,handle,status,thumbnail,metadata,*variants,*variants.prices,*images,*categories"
        );
        const res = await adminFetch(url.pathname + url.search);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`listProducts failed (${res.status}): ${text}`);
        }
        return (await res.json()) as { products: AdminProduct[]; count: number };
      })();
      return data.products?.[0] ?? null;
    },

    createProduct: async (body: Record<string, unknown>) => {
      const res = await adminFetch("/admin/products", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`createProduct failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { product: AdminProduct };
      return data.product;
    },

    updateProduct: async (id: string, body: Record<string, unknown>) => {
      const res = await adminFetch(`/admin/products/${id}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`updateProduct ${id} failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { product: AdminProduct };
      return data.product;
    },

    listCategories: async () => {
      const res = await adminFetch("/admin/product-categories?limit=100");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`listCategories failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { product_categories?: AdminCategory[] };
      return data.product_categories ?? [];
    },

    createCategory: async (name: string, handle: string) => {
      const res = await adminFetch("/admin/product-categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          handle,
          is_active: true,
          is_internal: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`createCategory failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { product_category: AdminCategory };
      return data.product_category;
    },

    listRegions: async () => {
      const res = await adminFetch("/admin/regions?limit=50");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`listRegions failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { regions?: AdminRegion[] };
      return data.regions ?? [];
    },

    listSalesChannels: async () => {
      const res = await adminFetch("/admin/sales-channels?limit=10");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`listSalesChannels failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { sales_channels?: AdminSalesChannel[] };
      return data.sales_channels ?? [];
    },

    listInventoryItems: async (params?: { limit?: number; offset?: number }) => {
      const limit = params?.limit ?? 100;
      const offset = params?.offset ?? 0;
      const res = await adminFetch(
        `/admin/inventory-items?limit=${limit}&offset=${offset}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`listInventoryItems failed (${res.status}): ${text}`);
      }
      return (await res.json()) as { inventory_items: AdminInventoryItem[]; count: number };
    },

    updateInventoryItem: async (id: string, body: Record<string, unknown>) => {
      const res = await adminFetch(`/admin/inventory-items/${id}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`updateInventoryItem ${id} failed (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { inventory_item: AdminInventoryItem };
      return data.inventory_item;
    },
  };
}

