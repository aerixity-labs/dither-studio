import {
  Download01Icon,
  Gif02Icon,
  Image01Icon,
  Jpg02Icon,
  MpFour02Icon,
  Png02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { AnimatePresence, motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { useExportJob } from '@/hooks/use-export-job'
import { useMotionTransition } from '@/hooks/use-motion-transition'
import { canAnimate, isErrorDiffusion, type DitherSettings } from '@/lib/dither/core'
import { STILL_FORMATS, STILL_FORMAT_ORDER, type StillFormat } from '@/lib/dither/export-still'

/** WebP has no icon in the set, so it keeps the generic image mark. */
const STILL_ICONS: Record<StillFormat, typeof Image01Icon> = {
  png: Png02Icon,
  jpeg: Jpg02Icon,
  webp: Image01Icon,
}

type Props = {
  image: HTMLImageElement | null
  fileName: string
  settings: DitherSettings
}

/** Both states share these, so the swap between them cannot drift. */
const SWAP_MOTION = {
  layout: true,
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
}

/**
 * While an export runs the trigger is replaced by progress. No text label: the rail is only
 * 380px wide and already carries a heading, so spelling the job out wrapped onto two lines
 * and pushed Cancel off the edge. The wording survives for screen readers.
 */
export function ExportMenu(props: Props) {
  const { image, fileName, settings } = props
  const { job, canRecordVideo, cancel, exportStillAs, exportAsVideo, exportAsGif } = useExportJob({
    image,
    fileName,
    settings,
  })

  /**
   * Without `layout` on both states the sibling icon buttons in the rail header jump
   * sideways the instant an export starts or finishes: the two are very different widths.
   */
  const swapTransition = useMotionTransition()

  const isAnimatable = canAnimate(settings)
  const animatedHint = isErrorDiffusion(settings.pattern)
    ? 'needs an ordered pattern'
    : 'turn Motion on'
  const videoHint = canRecordVideo ? animatedHint : 'not supported by this browser'
  const percent = job?.progress
    ? Math.round((job.progress.completed / job.progress.total) * 100)
    : 0

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {job ? (
        <motion.div
          key="progress"
          {...SWAP_MOTION}
          transition={swapTransition}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <Spinner className="text-muted-foreground size-3.5 shrink-0" />
          <span className="sr-only" aria-live="polite">
            {job.label}
          </span>
          {job.progress ? (
            <>
              <Progress value={percent} className="min-w-12 flex-1" aria-label={job.label} />
              <span className="text-muted-foreground w-7 text-right font-mono text-[11px] tabular-nums">
                {percent}%
              </span>
            </>
          ) : null}
          {job.isCancellable ? (
            <Button type="button" size="sm" variant="destructive" onClick={cancel}>
              Cancel
            </Button>
          ) : null}
        </motion.div>
      ) : (
        <motion.div key="trigger" {...SWAP_MOTION} transition={swapTransition}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={!image}>
                <HugeiconsIcon
                  icon={Download01Icon}
                  strokeWidth={1.5}
                  className="size-3.5"
                  aria-hidden
                />
                Download
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-[11px] font-normal">
                Still &ndash; full source resolution
              </DropdownMenuLabel>
              {STILL_FORMAT_ORDER.map(function renderFormat(format) {
                return (
                  <DropdownMenuItem
                    key={format}
                    onSelect={function onSelect() {
                      exportStillAs(format)
                    }}
                  >
                    <HugeiconsIcon
                      icon={STILL_ICONS[format]}
                      strokeWidth={1.5}
                      className="size-3.5"
                      aria-hidden
                    />
                    {STILL_FORMATS[format].label}
                  </DropdownMenuItem>
                )
              })}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] font-normal">
                Animated {isAnimatable ? '' : `– ${animatedHint}`}
              </DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!isAnimatable || !canRecordVideo}
                onSelect={exportAsVideo}
              >
                <HugeiconsIcon
                  icon={MpFour02Icon}
                  strokeWidth={1.5}
                  className="size-3.5"
                  aria-hidden
                />
                Video {canRecordVideo ? '(WebM / MP4)' : `– ${videoHint}`}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!isAnimatable} onSelect={exportAsGif}>
                <HugeiconsIcon
                  icon={Gif02Icon}
                  strokeWidth={1.5}
                  className="size-3.5"
                  aria-hidden
                />
                Animated GIF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
