import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    repository: z.url().refine((value) => value.startsWith('https://'), {
      message: 'Project links must use HTTPS.',
    }),
    tags: z.array(z.string().min(1)).default([]),
    order: z.number().int().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
