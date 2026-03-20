import { en } from "./locales/en";
import { fr } from "./locales/fr";

export type SupportedLocale = "en" | "fr";

const locales = { en, fr } as const;

export function useTranslations(locale: SupportedLocale) {
  return locales[locale] ?? locales.en;
}

export function getAlternateLocale(locale: SupportedLocale): SupportedLocale {
  return locale === "en" ? "fr" : "en";
}

const frSlugMap: Record<string, string> = {
  "/shop/": "/boutique/",
  "/about/": "/a-propos/",
  "/cart/": "/panier/",
};

const canonicalFromFrSlugMap = Object.fromEntries(
  Object.entries(frSlugMap).map(([canonical, frSlug]) => [frSlug, canonical]),
) as Record<string, string>;

function normalizePath(path: string): string {
  if (!path) return "/";
  if (path === "/") return "/";
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function toCanonicalPath(path: string): string {
  const normalized = normalizePath(path);
  if (!normalized.startsWith("/fr/") && normalized !== "/fr/") {
    return normalized;
  }

  const unprefixed = normalized === "/fr/" ? "/" : normalized.replace(/^\/fr/, "");
  return canonicalFromFrSlugMap[unprefixed] ?? unprefixed;
}

export function localePath(locale: SupportedLocale, path: string): string {
  const canonicalPath = toCanonicalPath(path);
  if (locale === "en") return canonicalPath;
  const localizedPath = frSlugMap[canonicalPath] ?? canonicalPath;
  return `/fr${localizedPath}`;
}

export function switchLocalePath(path: string, targetLocale: SupportedLocale): string {
  return localePath(targetLocale, path);
}

export const faqItems = [
  {
    question: "How do you authenticate your cards?",
    questionFr: "Comment authentifiez-vous vos cartes?",
    answer:
      "All cards are inspected by our team of experienced collectors. High-value cards are sent to PSA or BGS for professional grading. We guarantee the authenticity of every item sold.",
    answerFr:
      "Toutes les cartes sont inspectées par notre équipe de collectionneurs expérimentés. Les cartes de haute valeur sont envoyées à PSA ou BGS pour un gradage professionnel. Nous garantissons l'authenticité de chaque article vendu.",
  },
  {
    question: "What payment methods do you accept?",
    questionFr: "Quels modes de paiement acceptez-vous?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe payment system. All transactions are encrypted and secure.",
    answerFr:
      "Nous acceptons toutes les cartes de crédit principales (Visa, Mastercard, American Express) via notre système de paiement sécurisé Stripe. Toutes les transactions sont cryptées et sécurisées.",
  },
  {
    question: "What are Mystery Packs?",
    questionFr: "Que sont les Packs Mystère?",
    answer:
      "Mystery Packs are randomized packs containing trading cards of varying rarity. Each pack has clearly displayed odds and a guaranteed minimum value.",
    answerFr:
      "Les Packs Mystère sont des paquets aléatoires contenant des cartes à collectionner de différentes raretés. Chaque pack a des probabilités clairement affichées et une valeur minimale garantie.",
  },
  {
    question: "Do you ship internationally?",
    questionFr: "Livrez-vous à l'international?",
    answer:
      "Currently, we ship across Canada with free shipping on orders over $100. International shipping is coming soon. All shipments are fully insured and tracked.",
    answerFr:
      "Actuellement, nous livrons partout au Canada avec livraison gratuite pour les commandes de plus de 100$. La livraison internationale arrive bientôt. Tous les envois sont entièrement assurés et suivis.",
  },
  {
    question: "What is your return policy?",
    questionFr: "Quelle est votre politique de retour?",
    answer:
      "We accept returns within 14 days of delivery for items in their original condition. Graded cards and sealed products must be unopened. Mystery packs are final sale.",
    answerFr:
      "Nous acceptons les retours dans les 14 jours suivant la livraison pour les articles dans leur état d'origine. Les cartes gradées et les produits scellés doivent être non ouverts. Les packs mystère sont en vente finale.",
  },
  {
    question: "How do I track my order?",
    questionFr: "Comment suivre ma commande?",
    answer:
      "Once your order ships, you'll receive a tracking number via email. You can also check your order status in your account dashboard under 'My Orders'.",
    answerFr:
      "Une fois votre commande expédiée, vous recevrez un numéro de suivi par courriel. Vous pouvez également vérifier le statut de votre commande dans votre tableau de bord sous 'Mes Commandes'.",
  },
  {
    question: "Can I sell my cards to PokéStop MTL?",
    questionFr: "Puis-je vendre mes cartes à PokéStop MTL?",
    answer:
      "Yes! We buy collections and individual high-value cards. Contact us through our contact form or visit us in Montréal to get a quote.",
    answerFr:
      "Oui! Nous achetons des collections et des cartes individuelles de haute valeur. Contactez-nous via notre formulaire de contact ou visitez-nous à Montréal pour obtenir une évaluation.",
  },
];
