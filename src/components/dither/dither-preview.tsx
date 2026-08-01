import { Alert02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion } from 'motion/react'
import Image from 'next/image'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import type { RenderStatus } from '@/hooks/use-dither-render'
import { useMotionTransition } from '@/hooks/use-motion-transition'
import type { LoadedImage } from '@/hooks/use-source-image'
import { cn } from '@/lib/utils'

type Props = {
  image: LoadedImage
  canvasRef: (node: HTMLCanvasElement | null) => void
  status: RenderStatus
  error: string | null
  /** Splits the surface into original | dithered. */
  isComparing: boolean
}

function PaneLabel({ children }: { children: string }) {
  return (
    <Badge
      variant="secondary"
      className="absolute top-2 left-2 text-[10px] tracking-widest uppercase"
    >
      {children}
    </Badge>
  )
}

/**
 * Absolutely positioned rather than `h-full`: the canvas takes its size from the image, so
 * in normal flow a tall photo would stretch the card past the viewport instead of being
 * scaled down to fit inside it.
 */
export function DitherPreview(props: Props) {
  const { image, canvasRef, status, error, isComparing } = props
  const isBusy = status === 'preparing' || status === 'rendering'
  /** `layout` tweens the panes between one and two columns instead of snapping. */
  const layoutTransition = useMotionTransition({ type: 'spring', stiffness: 260, damping: 30 })

  return (
    <div className="absolute inset-0 overflow-hidden p-4">
      <motion.div
        layout
        transition={layoutTransition}
        className={cn('grid size-full gap-3', {
          'grid-cols-1 sm:grid-cols-2': isComparing,
          'grid-cols-1': !isComparing,
        })}
      >
        {isComparing ? (
          <motion.div
            layout
            transition={layoutTransition}
            className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg border"
          >
            <Image
              src={image.objectUrl}
              alt={`Original, undithered version of ${image.fileName}`}
              width={image.width}
              height={image.height}
              unoptimized
              className="max-h-full max-w-full object-contain"
            />
            <PaneLabel>Original</PaneLabel>
          </motion.div>
        ) : null}

        <motion.div
          layout
          transition={layoutTransition}
          className={cn('relative flex min-h-0 items-center justify-center overflow-hidden', {
            'rounded-lg border': isComparing,
          })}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Dithered version of ${image.fileName}`}
            aria-busy={isBusy}
            className="max-h-full max-w-full object-contain"
            /** Without `pixelated` the browser smooths the dither cells into mush. */
            style={{ imageRendering: 'pixelated' }}
          />
          {isComparing ? <PaneLabel>Dithered</PaneLabel> : null}
        </motion.div>
      </motion.div>

      {status === 'preparing' ? (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center gap-2 backdrop-blur-sm">
          <Spinner />
          <span className="text-muted-foreground text-xs">Reading image…</span>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="absolute inset-x-6 bottom-6 w-auto">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} className="size-4" aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
