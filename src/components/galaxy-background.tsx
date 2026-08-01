'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

const STAR_COLOR = '#ffffff'

/**
 * Layer height. Each layer stacks a second copy at this offset and the keyframe drifts by
 * `-100%`, so the two copies tile seamlessly whatever this value is.
 */
const FIELD = 2000

/** Stars are laid out this far past the viewport, so a widened window is covered. */
const WIDTH_HEADROOM = 400

const LAYERS = [
  { count: 500, size: 1, drift: 'motion-safe:animate-star-1' },
  { count: 200, size: 2, drift: 'motion-safe:animate-star-2' },
  { count: 100, size: 3, drift: 'motion-safe:animate-star-3' },
]

/**
 * Horizontal offsets span the measured width, not a fixed square: a fixed one would throw
 * away every star with a negative offset and leave a hard empty edge on wider viewports.
 */
function generateBoxShadow(count: number, width: number) {
  const shadows: string[] = []

  for (let index = 0; index < count; index++) {
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * FIELD)
    shadows.push(`${x}px ${y}px ${STAR_COLOR}`)
  }

  return shadows.join(', ')
}

/**
 * Three depth layers of stars, each painted as one `box-shadow` list and drifted with a
 * compositor-only transform. No rAF loop, no canvas: it costs nothing per frame on the
 * main thread, which the dither render loop needs.
 *
 * Drift is gated on `motion-safe` rather than a global override, so the rest of the app
 * keeps deciding about motion for itself.
 */
export function GalaxyBackground() {
  const [shadows, setShadows] = useState<string[]>([])

  useEffect(function scatterStars() {
    /** Widest span the current scatter covers, so a resize only redraws if it grew. */
    let coveredWidth = 0

    function scatter() {
      coveredWidth = window.innerWidth + WIDTH_HEADROOM
      setShadows(
        LAYERS.map(function toLayer(layer) {
          return generateBoxShadow(layer.count, coveredWidth)
        }),
      )
    }

    scatter()

    function onResize() {
      if (window.innerWidth > coveredWidth) scatter()
    }

    window.addEventListener('resize', onResize)
    return function unbind() {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div
      aria-hidden
      /** The wash is mixed from `--background`, so it cannot drift from the page colour. */
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_oklab,var(--background),white_5%)_0%,var(--background)_55%)]"
    >
      {LAYERS.map(function renderLayer(layer, index) {
        const boxShadow = shadows[index]
        if (!boxShadow) return null

        return (
          <div
            key={layer.drift}
            style={{ height: FIELD }}
            className={cn('absolute top-0 left-0 w-full will-change-transform', layer.drift)}
          >
            <span
              className="absolute top-0 left-0 rounded-full"
              style={{ width: layer.size, height: layer.size, boxShadow }}
            />
            <span
              className="absolute left-0 rounded-full"
              style={{ top: FIELD, width: layer.size, height: layer.size, boxShadow }}
            />
          </div>
        )
      })}
    </div>
  )
}
