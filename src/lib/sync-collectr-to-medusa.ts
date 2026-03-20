import type { CollectrProduct } from "./collectr";
import type {
  AdminRegion,
  AdminSalesChannel,
  createMedusaAdminClient,
} from "./medusa-admin-client";

type AdminClient = ReturnType<typeof createMedusaAdminClient>;

export type SyncStats = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  fixedInventoryItems: number;
};

export type SyncOptions = {
  portfolio: CollectrProduct[];
  dryRun?: boolean;
  categoryMap?: Record<string, { name: string; handle: string }>;
};

const DEFAULT_CATEGORY_MAP: Record<string, { name: string; handle: string }> = {
  Pokemon: { name: "Pokemon Cards", handle: "pokemon-cards" },
  "Magic: The Gathering": { name: "Magic: The Gathering", handle: "magic" },
  "One Piece": { name: "One Piece", handle: "one-piece" },
  YuGiOh: { name: "Yu-Gi-Oh!", handle: "yugioh" },
  Marvel: { name: "Marvel", handle: "marvel" },
  Lorcana: { name: "Lorcana", handle: "lorcana" },
  "Dragon Ball Super Fusion World": { name: "Dragon Ball Super", handle: "dragon-ball" },
  Digimon: { name: "Digimon", handle: "digimon" },
  "Flesh and Blood": { name: "Flesh and Blood", handle: "flesh-and-blood" },
};

const LANG_LABELS: Record<string, string> = {
  en: "English",
  jp: "Japanese",
  cn: "Chinese",
};

function buildSubtitle(item: CollectrProduct): string {
  const parts: string[] = [];
  if (item.setName) parts.push(item.setName);
  if (item.cardNumber) parts.push(item.cardNumber);
  if (item.rarity) parts.push(item.rarity);
  return parts.join(" · ") || item.category;
}

function buildDescription(item: CollectrProduct): string {
  const lines: string[] = [];
  const typeLabel = item.productType === "card" ? "Trading Card" : "Sealed Product";
  lines.push(`${item.name} — ${typeLabel} from the ${item.setName || item.category} set.`);

  if (item.condition) lines.push(`Condition: ${item.condition}.`);
  if (item.rarity) lines.push(`Rarity: ${item.rarity}.`);
  if (item.cardNumber) lines.push(`Card Number: ${item.cardNumber}.`);
  if (item.foil) lines.push("Foil variant.");

  const lang = LANG_LABELS[item.language] ?? item.language;
  lines.push(`Language: ${lang}. Grading: ${item.gradingStatus}.`);
  lines.push("Market price tracked via Collectr.");
  return lines.join(" ");
}

function buildTags(item: CollectrProduct): string[] {
  const tags: string[] = [item.productType];
  if (item.setName) tags.push(item.setName);
  if (item.rarity) tags.push(item.rarity);
  if (item.language !== "en") tags.push(LANG_LABELS[item.language] ?? item.language);
  if (item.foil) tags.push("Foil");
  if (item.gradingStatus === "graded") tags.push("Graded");
  return tags;
}

function buildSku(item: CollectrProduct): string {
  if (item.cardNumber) return item.cardNumber;
  return item.handle.toUpperCase().replace(/-/g, "_").substring(0, 30);
}

export async function syncCollectrToMedusa(
  client: AdminClient,
  options: SyncOptions
): Promise<SyncStats> {
  const dryRun = options.dryRun === true;
  const categoryMapInput = options.categoryMap ?? DEFAULT_CATEGORY_MAP;

  const stats: SyncStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    fixedInventoryItems: 0,
  };

  await client.authenticate();

  const existingCats = await client.listCategories();
  const catMap = new Map<string, string>(); // handle -> id
  for (const cat of existingCats) {
    catMap.set(cat.handle, cat.id);
  }

  const regions = await client.listRegions();
  const usdRegion = regions.find((r) => r.currency_code === "usd") ?? regions[0];
  if (!usdRegion) throw new Error("No regions found — set up at least one in Medusa Admin");

  const salesChannels = await client.listSalesChannels();
  const defaultChannel = salesChannels[0];
  if (!defaultChannel) throw new Error("No sales channels found");

  for (const item of options.portfolio) {
    try {
      await syncProduct(client, item, catMap, usdRegion, defaultChannel, categoryMapInput, dryRun, stats);
    } catch (err: any) {
      stats.errors++;
      console.error(`ERROR [${item.handle}]: ${err?.message ?? String(err)}`);
    }
  }

  if (!dryRun) {
    stats.fixedInventoryItems = await fixInventoryItemTitles(client);
  }

  return stats;
}

async function fixInventoryItemTitles(client: AdminClient): Promise<number> {
  const allProducts = await client.listProducts({ limit: 200 });
  const skuToTitle = new Map<string, string>();
  for (const p of allProducts.products) {
    for (const v of p.variants ?? []) {
      if (v.sku) skuToTitle.set(v.sku, p.title);
    }
  }

  let offset = 0;
  const limit = 100;
  let fixed = 0;

  while (true) {
    const page = await client.listInventoryItems({ limit, offset });
    const items = page.inventory_items;
    if (!items.length) break;

    for (const inv of items) {
      const newTitle = skuToTitle.get(inv.sku ?? "");
      if (!newTitle) continue;
      if (inv.title === newTitle) continue;

      await client.updateInventoryItem(inv.id, {
        title: newTitle,
        description: newTitle,
      });
      fixed++;
    }

    if (items.length < limit) break;
    offset += limit;
  }

  return fixed;
}

async function syncProduct(
  client: AdminClient,
  item: CollectrProduct,
  catMap: Map<string, string>,
  region: AdminRegion,
  channel: AdminSalesChannel,
  categoryMapInput: Record<string, { name: string; handle: string }>,
  dryRun: boolean,
  stats: SyncStats
) {
  const label = `[${item.handle}] ${item.name}`;

  const catInfo = categoryMapInput[item.category] ?? {
    name: item.category,
    handle: item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  };

  if (!catMap.has(catInfo.handle)) {
    if (dryRun) {
      catMap.set(catInfo.handle, "dry-run-id");
    } else {
      const newCat = await client.createCategory(catInfo.name, catInfo.handle);
      catMap.set(catInfo.handle, newCat.id);
    }
  }

  const categoryId = catMap.get(catInfo.handle)!;

  const metadata: Record<string, unknown> = {
    set_name: item.setName,
    price_cents: item.priceCents,
    product_type: item.productType,
    language: item.language,
    grading_status: item.gradingStatus,
    rarity: item.rarity,
    condition: item.condition,
    card_number: item.cardNumber,
    foil: item.foil || null,
    quantity: item.quantity,
    category_name: item.category,
  };

  const subtitle = buildSubtitle(item);
  const description = buildDescription(item);
  const sku = buildSku(item);
  const tags = buildTags(item);

  const sharedFields: Record<string, unknown> = {
    title: item.name,
    subtitle,
    description,
    thumbnail: item.imageUrl,
    discountable: true,
    metadata,
    categories: [{ id: categoryId }],
    images: [{ url: item.imageUrl }],
    tags: tags.map((value) => ({ value })),
  };

  const existing = await client.findProductByHandle(item.handle);

  if (existing) {
    if (dryRun) {
      stats.updated++;
      return;
    }

    const firstVariant = (existing as { variants?: { id: string; prices?: { id: string; currency_code: string }[] }[] })?.variants?.[0];
    const firstVariantId = firstVariant?.id;
    await client.updateProduct(existing.id, {
      ...sharedFields,
      variants: firstVariantId ? [{ id: firstVariantId, title: item.name }] : undefined,
    });

    // Keep variant money in sync with Collectr (updateProduct alone does not refresh price lists).
    if (firstVariantId) {
      const priceRow =
        firstVariant?.prices?.find((pr) => pr.currency_code === region.currency_code) ??
        firstVariant?.prices?.[0];
      await client.updateVariant(firstVariantId, {
        manage_inventory: false,
        prices: priceRow?.id
          ? [
              {
                id: priceRow.id,
                amount: item.priceCents,
                currency_code: region.currency_code,
              },
            ]
          : [
              {
                amount: item.priceCents,
                currency_code: region.currency_code,
              },
            ],
      });
    }

    console.log(`~ Updated: ${label}`);
    stats.updated++;
    return;
  }

  if (dryRun) {
    console.log(`+ Would create: ${label}`);
    stats.created++;
    return;
  }

  const body: Record<string, unknown> = {
    ...sharedFields,
    handle: item.handle,
    status: "published",
    sales_channels: [{ id: channel.id }],
    options: [{ title: "Default", values: ["Default"] }],
    variants: [
      {
        title: item.name,
        sku,
        manage_inventory: false,
        prices: [{ amount: item.priceCents, currency_code: region.currency_code }],
        options: { Default: "Default" },
      },
    ],
  };

  await client.createProduct(body);
  console.log(`+ Created: ${label}`);
  stats.created++;
}

