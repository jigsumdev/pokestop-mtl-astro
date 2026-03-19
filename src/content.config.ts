import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    publishDate: z.coerce.date(),
    locale: z.enum(['en', '[locale]']),
    author: z.string().default('[Brand Name]'),
  }),
});

export const collections = { blog };
