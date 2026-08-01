type PalettePreset = {
  id: string
  label: string
  /** Ordered dark to light. */
  colors: string[]
}

export const PALETTE_PRESETS: readonly PalettePreset[] = [
  { id: 'ink-paper', label: 'Ink & paper', colors: ['#0d0d0f', '#f5f2ea'] },
  { id: 'sepia', label: 'Sepia', colors: ['#1b2033', '#c9a227', '#f2e8d5'] },
  { id: 'newsprint', label: 'Newsprint', colors: ['#0d0d0f', '#6b6b66', '#c9c7c0', '#f2ead8'] },
  { id: 'gameboy', label: 'Game Boy', colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] },
  { id: 'cyanotype', label: 'Cyanotype', colors: ['#08243b', '#1e5f8c', '#7fb2d1', '#e8f1f5'] },
  { id: 'risograph', label: 'Risograph', colors: ['#2b2b6e', '#e0457b', '#f5c04a', '#f7f2e4'] },
  { id: 'amber-crt', label: 'Amber CRT', colors: ['#100b04', '#8a4b06', '#e08a1e', '#ffd08a'] },
  {
    id: 'thermal',
    label: 'Thermal',
    colors: ['#04021a', '#5c1a8a', '#e0483d', '#f7d14a', '#fdfbe8'],
  },
] as const

export const MIN_PALETTE_COLORS = 2
export const MAX_PALETTE_COLORS = 8
