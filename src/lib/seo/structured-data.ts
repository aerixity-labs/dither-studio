import 'server-only'
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_FEATURES, SITE_NAME } from '@/constants/site'
import { getSiteUrl } from '@/lib/env'

/**
 * `WebApplication` rather than `SoftwareApplication`: it runs in the browser with nothing to
 * install, which is the distinction the subtype exists for. Emitting both would describe one
 * thing as two competing entities.
 */
export function getStructuredData() {
  const siteUrl = getSiteUrl()

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${siteUrl}/#app`,
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'Image editor',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript, HTML canvas and Web Workers',
    isAccessibleForFree: true,
    /** `priceCurrency` is required whenever `price` is present, even at zero. */
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: SITE_FEATURES,
    inLanguage: 'en',
    image: new URL('/logo.png', siteUrl).toString(),
    author: { '@type': 'Organization', name: SITE_AUTHOR, url: siteUrl },
  }
}
