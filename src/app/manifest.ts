import type { MetadataRoute } from 'next'

import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_THEME_COLOR } from '@/constants/site'

/**
 * Reuses the existing `icon.png` and `apple-icon.png` routes, so it costs no new files.
 * Neither is declared `maskable`: both have alpha and no safe-zone padding, so Android's
 * circular mask would crop the mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: SITE_THEME_COLOR,
    theme_color: SITE_THEME_COLOR,
    categories: ['photo', 'utilities'],
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  }
}
