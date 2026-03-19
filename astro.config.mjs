import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://pokestopmtl.com",
  output: "static",
  trailingSlash: "always",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en-CA",
          fr: "fr-CA",
        },
      },
    }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr"],
    routing: { prefixDefaultLocale: false },
  },
});
