/*
  products.ts — PokéStop MTL
  Static product catalog (fallback / seed data when Medusa is unavailable)
  Synced from Collectr inventory – 19 March 2026
*/

export interface Product {
  id: string;
  handle: string;
  name: string;
  nameFr: string;
  price: number;
  image: string;
  category: "pokemon-cards" | "marketplace" | "mystery-packs" | "one-piece" | "magic";
  stock: number;
  badge?: "new" | "hot" | "rare" | "sale";
  grade?: string;
  condition?: "mint" | "near_mint" | "excellent" | "good" | "played";
  rarity?: "common" | "uncommon" | "rare" | "ultra_rare" | "secret_rare";
  sku?: string;
}

const collectrImg = (file: string) =>
  `https://public.getcollectr.com/public-assets/products/${file}`;

export const products: Product[] = [
  { id: "inv-1", handle: "fist-divine-speed-case", name: "A Fist of Divine Speed Booster Box Case", nameFr: "A Fist of Divine Speed Booster Box Case", price: 4897.49, image: collectrImg("product_620181.png"), category: "one-piece", stock: 1, badge: "hot", sku: "INV-1" },
  { id: "inv-2", handle: "one-piece-heroines-case", name: "Extra Booster: One Piece Heroines Edition Box Case", nameFr: "Extra Booster: One Piece Heroines Edition Box Case", price: 3769.58, image: collectrImg("product_666892.png"), category: "one-piece", stock: 2, badge: "hot", sku: "INV-2" },
  { id: "inv-3", handle: "roronoa-zoro-alt-art-manga", name: "Roronoa Zoro (Alternate Art) (Manga)", nameFr: "Roronoa Zoro (Art Alternatif) (Manga)", price: 3412.36, image: collectrImg("product_541660.jpg"), category: "one-piece", stock: 1, badge: "rare", rarity: "secret_rare", sku: "INV-3" },
  { id: "inv-4", handle: "battle-styles-case", name: "Battle Styles Booster Box Case", nameFr: "Battle Styles Booster Box Case", price: 1585.00, image: collectrImg("product_233335.png"), category: "pokemon-cards", stock: 2, badge: "hot", sku: "INV-4" },
  { id: "inv-5", handle: "ascended-heroes-etb-case", name: "Ascended Heroes Elite Trainer Box Case", nameFr: "Ascended Heroes Elite Trainer Box Case", price: 1363.18, image: collectrImg("product_679558.webp"), category: "pokemon-cards", stock: 1, badge: "new", sku: "INV-5" },
  { id: "inv-6", handle: "ff-collector-booster-display", name: "Universes Beyond: FINAL FANTASY - Collector Booster Display", nameFr: "Universes Beyond: FINAL FANTASY - Collector Booster Display", price: 1093.83, image: collectrImg("product_618893.png"), category: "magic", stock: 2, badge: "hot", sku: "INV-6" },
  { id: "inv-7", handle: "spiritforged-booster-display-case", name: "Spiritforged - Booster Display Case", nameFr: "Spiritforged - Booster Display Case", price: 994.92, image: collectrImg("product_661937.png"), category: "marketplace", stock: 5, sku: "INV-7" },
  { id: "inv-8", handle: "jewelry-bonney-118-manga", name: "Jewelry Bonney (118) (Manga)", nameFr: "Jewelry Bonney (118) (Manga)", price: 941.40, image: collectrImg("product_643867.jpg"), category: "one-piece", stock: 1, badge: "rare", rarity: "secret_rare", condition: "near_mint", sku: "INV-8" },
  { id: "inv-9", handle: "mega-evolution-etb-case", name: "Mega Evolution Elite Trainer Box Case", nameFr: "Mega Evolution Elite Trainer Box Case", price: 828.14, image: collectrImg("product_644727.png"), category: "pokemon-cards", stock: 1, sku: "INV-9" },
  { id: "inv-10", handle: "twilight-masquerade-etb-case", name: "Twilight Masquerade Elite Trainer Box Case", nameFr: "Twilight Masquerade Elite Trainer Box Case", price: 703.82, image: collectrImg("product_544385.png"), category: "pokemon-cards", stock: 1, sku: "INV-10" },
  { id: "inv-11", handle: "tmnt-collector-booster-display", name: "Teenage Mutant Ninja Turtles - Collector Booster Display", nameFr: "Teenage Mutant Ninja Turtles - Collector Booster Display", price: 416.72, image: collectrImg("product_657852.png"), category: "magic", stock: 2, badge: "new", sku: "INV-11" },
  { id: "inv-12", handle: "avatar-collector-booster-display", name: "Avatar: The Last Airbender - Collector Booster Display", nameFr: "Avatar: The Last Airbender - Collector Booster Display", price: 381.57, image: collectrImg("product_648650.png"), category: "magic", stock: 2, sku: "INV-12" },
  { id: "inv-13", handle: "phantasmal-flames-bbb-display", name: "Phantasmal Flames Build & Battle Box Display", nameFr: "Phantasmal Flames Build & Battle Box Display", price: 320.17, image: collectrImg("product_654164.png"), category: "pokemon-cards", stock: 3, sku: "INV-13" },
  { id: "inv-14", handle: "origins-booster-display", name: "Origins - Booster Display", nameFr: "Origins - Booster Display", price: 299.50, image: collectrImg("product_635368.png"), category: "marketplace", stock: 3, sku: "INV-14" },
  { id: "inv-15", handle: "journey-together-enhanced-booster", name: "Journey Together Enhanced Booster Box", nameFr: "Journey Together Enhanced Booster Box", price: 254.46, image: collectrImg("product_623628.png"), category: "pokemon-cards", stock: 7, badge: "hot", sku: "INV-15" },
  { id: "inv-16", handle: "surging-sparks-booster-box", name: "Surging Sparks Booster Box", nameFr: "Surging Sparks Booster Box", price: 252.21, image: collectrImg("product_565606.png"), category: "pokemon-cards", stock: 1, sku: "INV-16" },
  { id: "inv-17", handle: "ff-scene-box-case", name: "FINAL FANTASY - Scene Box Case", nameFr: "FINAL FANTASY - Scene Box Case", price: 205.32, image: collectrImg("product_656624.png"), category: "magic", stock: 1, sku: "INV-17" },
  { id: "inv-18", handle: "paldean-fates-premium-collection", name: "Paldean Fates Great Tusk ex & Iron Treads ex Premium Collection", nameFr: "Paldean Fates Great Tusk ex & Iron Treads ex Premium Collection", price: 206.94, image: collectrImg("product_665113.png"), category: "pokemon-cards", stock: 6, sku: "INV-18" },
  { id: "inv-19", handle: "151-booster-bundle", name: "151 Booster Bundle", nameFr: "151 Booster Bundle", price: 185.02, image: collectrImg("product_502000.png"), category: "pokemon-cards", stock: 1, badge: "hot", sku: "INV-19" },
  { id: "inv-20", handle: "151-jumbo-booster-box-cn", name: "Collect 151 Journey Jumbo Booster Box (CN)", nameFr: "Collect 151 Journey Jumbo Booster Box (CN)", price: 129.91, image: collectrImg("product_10027885.png"), category: "pokemon-cards", stock: 5, sku: "INV-20" },
  { id: "inv-21", handle: "ff-bundle", name: "Universes Beyond: FINAL FANTASY - Bundle", nameFr: "Universes Beyond: FINAL FANTASY - Bundle", price: 99.47, image: collectrImg("product_618897.png"), category: "magic", stock: 1, sku: "INV-21" },
  { id: "inv-22", handle: "hot-air-arena-booster-jp", name: "Hot Air Arena Booster Box (JP)", nameFr: "Hot Air Arena Booster Box (JP)", price: 95.93, image: collectrImg("product_10026812.png"), category: "pokemon-cards", stock: 2, sku: "INV-22" },
  { id: "inv-23", handle: "prismatic-evolutions-booster-bundle", name: "Prismatic Evolutions Booster Bundle", nameFr: "Prismatic Evolutions Booster Bundle", price: 71.35, image: collectrImg("product_600518.png"), category: "pokemon-cards", stock: 4, sku: "INV-23" },
  { id: "inv-24", handle: "gem-pack-booster-box-cn", name: "Gem Pack Booster Box (CN)", nameFr: "Gem Pack Booster Box (CN)", price: 59.01, image: collectrImg("product_10027285.png"), category: "pokemon-cards", stock: 5, sku: "INV-24" },
  { id: "inv-25", handle: "destined-rivals-booster-bundle", name: "Destined Rivals Booster Bundle", nameFr: "Destined Rivals Booster Bundle", price: 58.30, image: collectrImg("product_625670.png"), category: "pokemon-cards", stock: 5, badge: "new", sku: "INV-25" },
  { id: "inv-26", handle: "prismatic-evolutions-surprise-box", name: "Prismatic Evolutions Surprise Box", nameFr: "Prismatic Evolutions Surprise Box", price: 53.72, image: collectrImg("product_593466.png"), category: "pokemon-cards", stock: 4, sku: "INV-26" },
  { id: "inv-27", handle: "journey-together-booster-bundle", name: "Journey Together Booster Bundle", nameFr: "Journey Together Booster Bundle", price: 37.64, image: collectrImg("product_610953.png"), category: "pokemon-cards", stock: 1, sku: "INV-27" },
  { id: "inv-28", handle: "azure-legends-tin-xerneas", name: "Azure Legends Tin [Xerneas ex]", nameFr: "Azure Legends Tin [Xerneas ex]", price: 33.47, image: collectrImg("product_616293.png"), category: "pokemon-cards", stock: 1, badge: "new", sku: "INV-28" },
  { id: "inv-29", handle: "prismatic-evolutions-poster-collection", name: "Prismatic Evolutions Poster Collection", nameFr: "Prismatic Evolutions Poster Collection", price: 33.16, image: collectrImg("product_593359.png"), category: "pokemon-cards", stock: 1, sku: "INV-29" },
  { id: "inv-30", handle: "2-pack-blister-tornadus-thundurus-landorus", name: "2 Pack Blister [Tornadus, Thundurus & Landorus]", nameFr: "2 Pack Blister [Tornadus, Thundurus & Landorus]", price: 21.85, image: collectrImg("product_634329.png"), category: "pokemon-cards", stock: 2, sku: "INV-30" },
];

export const mysteryPacks: Product[] = [];
