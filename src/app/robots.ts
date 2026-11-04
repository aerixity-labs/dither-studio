import type { MetadataRoute } from 'next'

import { getIsProduction, getSiteUrl } from '@/lib/env'

/** Static export: generated once at build time. */
export const dynamic = 'force-static'

/**
 * No named AI-crawler groups: in robots.txt a named group *replaces* the `*` group for that
 * agent instead of merging with it, so listing GPTBot and friends would silently opt them out
 * of any future rule added to `*`. `Allow: /` already covers every bot, which is what a free
 * tool wants – being cited is the point.
 */
export default function robots(): MetadataRoute.Robots {
  if (!getIsProduction()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', getSiteUrl()).toString(),
  }
}
