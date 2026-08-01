/**
 * `gifenc` ships no type declarations. This covers the surface used by
 * `@/lib/dither/export-gif` and nothing more.
 */
declare module 'gifenc' {
  export type GifPalette = number[][]

  export type GifColorFormat = 'rgb565' | 'rgb444' | 'rgba4444'

  export type QuantizeOptions = {
    format?: GifColorFormat
    oneBitAlpha?: boolean | number
    clearAlpha?: boolean
    clearAlphaThreshold?: number
    clearAlphaColor?: number
  }

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions,
  ): GifPalette

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: GifColorFormat,
  ): Uint8Array

  export type WriteFrameOptions = {
    palette?: GifPalette
    first?: boolean
    transparent?: boolean
    transparentIndex?: number
    delay?: number
    repeat?: number
    dispose?: number
  }

  export type GifEncoderInstance = {
    writeFrame(index: Uint8Array, width: number, height: number, options?: WriteFrameOptions): void
    finish(): void
    bytes(): Uint8Array<ArrayBuffer>
    bytesView(): Uint8Array<ArrayBuffer>
    reset(): void
  }

  export function GIFEncoder(options?: {
    auto?: boolean
    initialCapacity?: number
  }): GifEncoderInstance
}
