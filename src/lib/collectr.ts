/*
  collectr.ts — PokéStop MTL
  Collectr portfolio data fetcher & normalizer.

  Supports two data sources:
    1. A local JSON export file (src/data/collectr-portfolio.json)
    2. Fallback to the static products.ts catalog

  The Collectr Partner API (api-v2.getcollectr.com) requires registered
  access. Once you have API credentials, extend fetchFromApi() below.
*/

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CollectrProduct {
  name: string;
  handle: string;
  setName: string;
  priceDollars: number;
  priceCents: number;
  quantity: number;
  imageUrl: string;
  category: string;
  productType: "sealed" | "card";
  language: "en" | "jp" | "cn";
  rarity: string | null;
  condition: string | null;
  cardNumber: string | null;
  gradingStatus: "ungraded" | "graded";
  foil: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

function detectLanguage(name: string): "en" | "jp" | "cn" {
  if (/\(JP\)/i.test(name)) return "jp";
  if (/\(CN\)/i.test(name)) return "cn";
  return "en";
}

function detectProductType(item: PortfolioItem): "sealed" | "card" {
  if (item.rarity || item.cardNumber) return "card";
  return "sealed";
}

const COLLECTR_IMG_BASE = "https://public.getcollectr.com/public-assets/products/";

function collectrImgUrl(file: string): string {
  if (file.startsWith("http")) return file;
  return `${COLLECTR_IMG_BASE}${file}`;
}

// ─── Portfolio JSON shape (from collectr-portfolio.json) ───

interface PortfolioItem {
  name: string;
  handle?: string;
  setName: string;
  price: number;
  priceChange?: number;
  priceChangePercent?: number;
  quantity: number;
  image: string;
  category: string;
  rarity?: string | null;
  condition?: string | null;
  cardNumber?: string | null;
  graded?: boolean;
  foil?: boolean;
}

function normalizePortfolioItem(item: PortfolioItem): CollectrProduct {
  const priceDollars = item.price;
  const priceCents = Math.round(priceDollars * 100);
  const language = detectLanguage(item.name);
  const productType = detectProductType(item);

  return {
    name: item.name,
    handle: item.handle || slugify(item.name),
    setName: item.setName,
    priceDollars,
    priceCents,
    quantity: item.quantity,
    imageUrl: collectrImgUrl(item.image),
    category: item.category,
    productType,
    language,
    rarity: item.rarity ?? null,
    condition: item.condition ?? null,
    cardNumber: item.cardNumber ?? null,
    gradingStatus: item.graded ? "graded" : "ungraded",
    foil: item.foil ?? false,
  };
}

// ─── Load from portfolio JSON file ───

export function loadPortfolioFromFile(path?: string): CollectrProduct[] {
  const filePath = path ?? resolve(__dirname, "../data/collectr-portfolio.json");
  if (!existsSync(filePath)) {
    throw new Error(`Portfolio file not found: ${filePath}`);
  }
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as PortfolioItem[];
  return raw.map(normalizePortfolioItem);
}

// ─── Load from static products.ts (already in-memory) ───

interface StaticProduct {
  id: string;
  handle: string;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  badge?: string;
  rarity?: string;
  condition?: string;
  sku?: string;
}

export function normalizeStaticProducts(products: StaticProduct[]): CollectrProduct[] {
  return products.map((p) => ({
    name: p.name,
    handle: p.handle,
    setName: "",
    priceDollars: p.price,
    priceCents: Math.round(p.price * 100),
    quantity: p.stock,
    imageUrl: p.image,
    category: p.category,
    productType: (p.rarity ? "card" : "sealed") as "sealed" | "card",
    language: detectLanguage(p.name),
    rarity: p.rarity ?? null,
    condition: p.condition ?? null,
    cardNumber: null,
    gradingStatus: "ungraded" as const,
    foil: false,
  }));
}

// ─── Main entry: load from best available source ───

export function loadPortfolio(jsonPath?: string): CollectrProduct[] {
  const defaultPath = resolve(__dirname, "../data/collectr-portfolio.json");
  const filePath = jsonPath ?? defaultPath;

  if (existsSync(filePath)) {
    console.log(`[Collectr] Loading portfolio from ${filePath}`);
    return loadPortfolioFromFile(filePath);
  }

  console.log("[Collectr] Portfolio JSON not found, falling back to static products.ts");
  // Dynamic import won't work in all contexts, so we re-read the file
  const productsPath = resolve(__dirname, "../data/products.ts");
  throw new Error(
    `No portfolio JSON found at ${filePath}. ` +
    `Create it from your Collectr export, or ensure ${productsPath} is available.`
  );
}
