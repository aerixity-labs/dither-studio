/** Revokes the object URL immediately: the click has already handed the blob to the browser. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** `photo 01.png` becomes `photo_01_dither.png`. */
export function buildFileName(baseName: string, extension: string) {
  const stem = baseName.replace(/\.[^.]+$/u, '')
  const safeStem = stem
    /** Letter/number classes, not `\W`, so `näme` survives instead of becoming `n_me`. */
    .replaceAll(/[^\p{L}\p{N}]+/gu, '_')
    .replaceAll(/_+/gu, '_')
    .replaceAll(/^_+|_+$/gu, '')
    .slice(0, 48)
    /** The slice can land mid-run, leaving a trailing separator behind. */
    .replace(/_+$/u, '')

  return `${safeStem || 'image'}_dither.${extension}`
}
