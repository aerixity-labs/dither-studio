import type { MetadataRoute } from 'next'

import { SITE_LAST_MODIFIED } from '@/constants/site'
import { getSiteUrl } from '@/lib/env'

/**
 * `lastModified` comes from a constant, not `new Date()`: a sitemap that claims every deploy
 * changed the content teaches crawlers to ignore the field. `changeFrequency` and `priority`
 * are omitted because search engines ignore both.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: getSiteUrl(), lastModified: SITE_LAST_MODIFIED }]
}
