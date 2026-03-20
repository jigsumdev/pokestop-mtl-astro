#!/usr/bin/env npx tsx
/*
  sync-collectr-to-medusa.ts — PokéStop MTL
  Syncs Collectr portfolio data into Medusa v2 as products with rich metadata.

  Usage:
    npx tsx src/scripts/sync-collectr-to-medusa.ts
    npx tsx src/scripts/sync-collectr-to-medusa.ts --dry-run
    npx tsx src/scripts/sync-collectr-to-medusa.ts --file path/to/portfolio.json
*/

import { loadPortfolioFromFile } from "../lib/collectr.js";
import { createMedusaAdminClient } from "../lib/medusa-admin-client.js";
import { syncCollectrToMedusa } from "../lib/sync-collectr-to-medusa.js";

// ─── CLI args ───

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const fileIdx = args.indexOf("--file");
const portfolioPath = fileIdx >= 0 ? args[fileIdx + 1] : undefined;

// ─── Main ───

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Collectr → Medusa Sync                        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  if (DRY_RUN) console.log("  🏃 DRY RUN — no changes will be made\n");

  // 1. Load Collectr portfolio
  console.log("[1/3] Loading Collectr portfolio...");
  const portfolio = loadPortfolioFromFile(portfolioPath);
  console.log(`  ✓ Loaded ${portfolio.length} products\n`);

  // 2. Create admin client
  console.log("[2/3] Creating Medusa Admin client...");
  const backendUrl =
    process.env.PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    "http://localhost:9000";
  const email = process.env.MEDUSA_ADMIN_EMAIL || "";
  const password = process.env.MEDUSA_ADMIN_PASSWORD || "";
  const client = createMedusaAdminClient({ backendUrl, email, password });
  console.log("  ✓ Client ready\n");

  // 3. Sync
  console.log("[3/3] Syncing products to Medusa...\n");
  const stats = await syncCollectrToMedusa(client, { portfolio, dryRun: DRY_RUN });

  // Summary
  console.log("══════════════════════════════════════════════════");
  console.log("  Sync complete!");
  console.log(`  Created:  ${stats.created}`);
  console.log(`  Updated:  ${stats.updated}`);
  console.log(`  Skipped:  ${stats.skipped}`);
  console.log(`  Errors:   ${stats.errors}`);
  console.log(`  Inventory titles fixed: ${stats.fixedInventoryItems}`);
  console.log("══════════════════════════════════════════════════\n");
}

// ─── Run ───

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
