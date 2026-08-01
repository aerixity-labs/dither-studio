import { ImageUploadIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from '@/constants/dither'
import { useMotionTransition } from '@/hooks/use-motion-transition'
import { cn } from '@/lib/utils'

type Props = {
  onSelect: (file: File) => void
  isBusy: boolean
}

/** The card lifts clear of its dashed outline on hover. */
const CARD_VARIANTS = {
  initial: { x: 0, y: 0 },
  animate: { x: 16, y: -16, opacity: 0.95 },
}

/** The outline is only meaningful once the card has moved off it. */
const OUTLINE_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

/** One gradient instead of the several hundred divs a tiled grid would need. */
const CHECKERBOARD = {
  backgroundImage:
    'conic-gradient(var(--color-muted) 25%, transparent 0 50%, var(--color-muted) 0 75%, transparent 0)',
  backgroundSize: '22px 22px',
}

/**
 * Accepts a file by drop, picker or paste. Paste is bound to the window because a drop
 * target cannot hold focus while the pointer is elsewhere.
 *
 * The whole surface is one `button`, so the pointer and keyboard targets are the same
 * element. That is also why every child is a `span`: `div`/`p` are not valid button content.
 */
export function ImageDropzone(props: Props) {
  const { onSelect, isBusy } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const cardTransition = useMotionTransition({ type: 'spring', stiffness: 300, damping: 20 })

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) onSelect(file)
  }

  useEffect(
    function bindPaste() {
      function onPaste(event: ClipboardEvent) {
        const file = event.clipboardData?.files?.[0]
        if (file) onSelect(file)
      }

      window.addEventListener('paste', onPaste)
      return function unbind() {
        window.removeEventListener('paste', onPaste)
      }
    },
    [onSelect],
  )

  function openPicker() {
    inputRef.current?.click()
  }

  return (
    <div
      className="relative size-full"
      onDragOver={function onDragOver(event) {
        event.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={function onDragLeave() {
        setIsDraggingOver(false)
      }}
      onDrop={function onDrop(event) {
        event.preventDefault()
        setIsDraggingOver(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <motion.button
        type="button"
        onClick={openPicker}
        whileHover={prefersReducedMotion ? undefined : 'animate'}
        initial="initial"
        animate="initial"
        className={cn(
          'group/file border-border/70 bg-card/30 relative block size-full cursor-pointer overflow-hidden rounded-lg border border-dashed text-center transition-colors',
          { 'border-primary bg-primary/5': isDraggingOver },
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_at_center,white,transparent_70%)] opacity-40"
          style={CHECKERBOARD}
        />

        <span className="relative z-10 flex h-full flex-col items-center justify-center gap-1.5 p-10">
          <span className="text-foreground text-sm font-medium">
            {isDraggingOver ? 'Drop to dither it' : 'Upload a photo'}
          </span>
          <span className="text-muted-foreground text-xs">
            Drag and drop, paste, or click to choose &middot; PNG, JPEG, WebP, GIF, AVIF up to{' '}
            {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB
          </span>

          <span className="relative mt-7 flex h-24 w-32 items-center justify-center">
            <motion.span
              variants={OUTLINE_VARIANTS}
              className="border-primary absolute inset-0 rounded-md border border-dashed opacity-0"
            />

            <motion.span
              variants={CARD_VARIANTS}
              transition={cardTransition}
              className="bg-card text-muted-foreground relative z-10 flex size-full flex-col items-center justify-center gap-1.5 rounded-md shadow-lg ring-1 ring-black/20 group-hover/file:shadow-2xl"
            >
              {isBusy ? (
                <Spinner className="size-5" />
              ) : (
                <HugeiconsIcon
                  icon={ImageUploadIcon}
                  strokeWidth={1.5}
                  className="size-5"
                  aria-hidden
                />
              )}
              <span className="text-[11px]">
                {isBusy ? 'Reading…' : isDraggingOver ? 'Drop it' : 'Choose a file'}
              </span>
            </motion.span>
          </span>
        </span>
      </motion.button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={function onChange(event) {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
