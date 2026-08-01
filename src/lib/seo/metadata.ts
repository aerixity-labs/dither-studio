import 'server-only'
import type { Metadata, Viewport } from 'next'

import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_THEME_COLOR,
  SITE_TITLE,
} from '@/constants/site'
import { getIsProduction, getSiteUrl } from '@/lib/env'

/** `width` and `initialScale` are omitted: Next's default viewport already sets both. */
export const siteViewport: Viewport = {
  themeColor: SITE_THEME_COLOR,
  colorScheme: 'dark',
}

/**
 * `openGraph.title/description` and every `twitter.*` field are deliberately unset: Next
 * inherits them from `title`/`description` and from `openGraph`, so the strings live in one
 * place. `openGraph.images` must also stay unset, or the `opengraph-image` file convention
 * stops merging in.
 */
export function getSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: SITE_TITLE,
      template: `%s – ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_AUTHOR }],
    creator: SITE_AUTHOR,
    publisher: SITE_AUTHOR,
    /** The readouts are bare figures, which iOS Safari would otherwise turn into tel: links. */
    formatDetection: { telephone: false, date: false, address: false, email: false },
    alternates: { canonical: '/' },
    /**
     * `robots.txt` stops crawling, but a URL that is only linked can still be indexed
     * without being crawled – and a crawl-blocked page can never be told `noindex`. So
     * previews say it in the HTML too.
     */
    robots: getIsProduction()
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: '/',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}
