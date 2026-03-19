import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const productsPath = path.join(repoRoot, "src", "data", "products.ts");
const outDir = path.join(repoRoot, "public", "products");

function guessExt(contentType) {
  if (!contentType) return ".jpg";
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (ct === "image/png") return ".png";
  if (ct === "image/webp") return ".webp";
  if (ct === "image/gif") return ".gif";
  return ".jpg";
}

function extractProducts(tsSource) {
  // Extract id + image URL pairs from the products array.
  // This is intentionally simple and tailored to current file shape.
  const results = [];
  const re = /{[^}]*?\bid:\s*"([^"]+)"[\s\S]*?\bimage:\s*"([^"]+)"[\s\S]*?}/g;
  let m;
  while ((m = re.exec(tsSource))) {
    const id = m[1];
    const image = m[2];
    if (!id || !image) continue;
    results.push({ id, image });
  }
  return results;
}

async function download(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type");
  return { buf, contentType };
}

async function main() {
  const src = await fs.readFile(productsPath, "utf8");
  const items = extractProducts(src);
  if (items.length === 0) {
    console.error("No products found to download.");
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(outDir, { recursive: true });

  let ok = 0;
  let failed = 0;

  for (const { id, image } of items) {
    if (!/^https?:\/\//i.test(image)) continue;
    try {
      const { buf, contentType } = await download(image);
      const ext = guessExt(contentType);
      const outPath = path.join(outDir, `${id}${ext}`);
      await fs.writeFile(outPath, buf);
      ok++;
      console.log(`Downloaded ${id} -> public/products/${id}${ext}`);
    } catch (err) {
      failed++;
      console.warn(`Failed ${id} (${image}): ${err?.message ?? err}`);
    }
  }

  console.log(`Done. ok=${ok} failed=${failed}`);
  if (failed > 0) process.exitCode = 2;
}

await main();

