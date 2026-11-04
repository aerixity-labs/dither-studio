import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Read at build time (static export). The production build sets `VERCEL_ENV=production` and
 * `NEXT_PUBLIC_SITE_URL`; the names are kept from the Vercel days.
 */
export const env = createEnv({
  server: {
    VERCEL_ENV: z.enum(['development', 'preview', 'production']).default('development'),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
  },
  runtimeEnv: {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  emptyStringAsUndefined: true,
})

const LOCALHOST_SITE_URL = 'http://localhost:3000'

/** Explicit configuration wins, then the platform, then local development. */
export function getSiteUrl() {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  return LOCALHOST_SITE_URL
}

export function getIsProduction() {
  return env.VERCEL_ENV === 'production'
}
