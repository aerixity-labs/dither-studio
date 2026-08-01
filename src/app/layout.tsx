import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'

import { GalaxyBackground } from '@/components/galaxy-background'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getSiteMetadata, siteViewport } from '@/lib/seo/metadata'

import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

/** Carried for the hex fields and the readout gauge, where digit alignment matters. */
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = getSiteMetadata()
export const viewport: Viewport = siteViewport

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <GalaxyBackground />
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
