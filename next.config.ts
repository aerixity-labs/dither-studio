import type { NextConfig } from 'next'

/**
 * Static export: `next build` writes the whole site to `out/`, served as plain files.
 *
 * Security headers (`X-Content-Type-Options`, `Referrer-Policy`) are set by the web server, since
 * an export has no `headers()`. No CSP: Next's bootstrap uses inline scripts, so a strict policy
 * would need per-request nonces.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: false,
  poweredByHeader: false,
  /** No image optimizer in an export. The only optimised image was the 28px word mark. */
  images: { unoptimized: true },
}

export default nextConfig
