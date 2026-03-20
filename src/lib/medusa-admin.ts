/*
  medusa-admin.ts — PokéStop MTL
  Node-oriented Medusa v2 Admin API client (used by local sync scripts).
  This file stays process.env-based, but the actual HTTP client lives in
  `medusa-admin-client.ts` so Pages Functions can reuse the same logic safely.
*/

import {
  createMedusaAdminClient,
  type AdminCategory,
  type AdminInventoryItem,
  type AdminProduct,
  type AdminVariant,
} from "./medusa-admin-client";

const BACKEND_URL =
  process.env.PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "";

const client = createMedusaAdminClient({
  backendUrl: BACKEND_URL,
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
});

export { type AdminCategory, type AdminInventoryItem, type AdminProduct, type AdminVariant };

export const authenticate = client.authenticate;
export const updateVariant = client.updateVariant;
export const listProducts = client.listProducts;
export const findProductByHandle = client.findProductByHandle;
export const createProduct = client.createProduct;
export const updateProduct = client.updateProduct;
export const listCategories = client.listCategories;
export const createCategory = client.createCategory;
export const listRegions = client.listRegions;
export const listSalesChannels = client.listSalesChannels;
export const listInventoryItems = client.listInventoryItems;
export const updateInventoryItem = client.updateInventoryItem;
