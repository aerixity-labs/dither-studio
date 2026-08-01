import type { NextConfig } from 'next'

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

/**
 * No CSP here: the page is fully static and Next's bootstrap uses inline scripts, so a strict
 * policy would need per-request nonces from middleware and would lose the prerender.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  /** The word mark is the only optimised image, and 99 keeps it crisp at 28px. */
  images: { qualities: [75, 99] },
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: SECURITY_HEADERS }])
  },
}

export default nextConfig
