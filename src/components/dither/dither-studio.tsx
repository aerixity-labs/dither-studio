'use client'

import {
  ArrowLeftRightIcon,
  ContrastIcon,
  Delete02Icon,
  Grid2X2Icon,
  PaintBoardIcon,
  Refresh01Icon,
  ShuffleSquareIcon,
  WaveIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { LayoutGroup, motion } from 'motion/react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/dither/animated-tabs'
import { ConfirmActionDialog } from '@/components/dither/confirm-action-dialog'
import { AnimationControls } from '@/components/dither/controls/animation-controls'
import { PaletteControls } from '@/components/dither/controls/palette-controls'
import { PatternControls } from '@/components/dither/controls/pattern-controls'
import { ToneControls } from '@/components/dither/controls/tone-controls'
import { DitherPreview } from '@/components/dither/dither-preview'
import { ExportMenu } from '@/components/dither/export-menu'
import { ImageDropzone } from '@/components/dither/image-dropzone'
import { MetaReadout } from '@/components/dither/meta-readout'
import { PresetPicker } from '@/components/dither/preset-picker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LOOK_PRESETS } from '@/constants/dither'
import { useDitherRender } from '@/hooks/use-dither-render'
import { useDitherSettings } from '@/hooks/use-dither-settings'
import { useSourceImage } from '@/hooks/use-source-image'
import { DEFAULT_MAX_RENDER_SIZE, areSettingsEqual } from '@/lib/dither/core'

const CONTROL_TABS = [
  { value: 'pattern', label: 'Pattern', icon: Grid2X2Icon },
  { value: 'tone', label: 'Tone', icon: ContrastIcon },
  { value: 'palette', label: 'Palette', icon: PaintBoardIcon },
  { value: 'motion', label: 'Motion', icon: WaveIcon },
]

/**
 * Each control carries its own `layout` so the row reflows when `ExportMenu` swaps to a
 * progress bar. The wrapper sits outside Tooltip/ConfirmActionDialog so it never interferes
 * with `asChild`; `ExportMenu` needs none because it carries `layout` internally.
 */
function RailItem({ children }: { children: ReactNode }) {
  return (
    <motion.div layout className="shrink-0">
      {children}
    </motion.div>
  )
}

/**
 * The preview card takes a fixed height while the layout is stacked, so a tall photo cannot
 * push the control rail off-screen; at `lg` it is released to flex.
 */
export function DitherStudio() {
  const { settings, patch, applyPreset, reset, rollRandom } = useDitherSettings()
  const [isComparing, setIsComparing] = useState(false)
  const [controlTab, setControlTab] = useState('pattern')

  const onUploadError = useCallback(function onUploadError(message: string) {
    toast.error('Could not use that file', { description: message })
  }, [])

  const { image, isBusy, load, clear } = useSourceImage({ onError: onUploadError })

  const onRenderError = useCallback(function onRenderError(error: Error) {
    console.error('Dither render failed.', error)
  }, [])

  const { canvasRef, status, error, size } = useDitherRender({
    image: image?.element ?? null,
    settings,
    maxRenderSize: DEFAULT_MAX_RENDER_SIZE,
    onError: onRenderError,
  })

  const activePreset = useMemo(
    function findActivePreset() {
      return LOOK_PRESETS.find(function byValue(preset) {
        return areSettingsEqual(preset.settings, settings)
      })
    },
    [settings],
  )

  function clearImage() {
    setIsComparing(false)
    clear()
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-h-0 flex-col gap-3" aria-label="Preview">
        {image ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <MetaReadout settings={settings} image={image} previewSize={size ?? null} />

            <div className="ml-auto flex items-center gap-2">
              <Toggle
                variant="outline"
                size="sm"
                pressed={isComparing}
                onPressedChange={setIsComparing}
                className="h-8 gap-1.5"
              >
                <HugeiconsIcon
                  icon={ArrowLeftRightIcon}
                  strokeWidth={1.5}
                  className="size-3.5"
                  aria-hidden
                />
                Compare
              </Toggle>

              <ConfirmActionDialog
                trigger={
                  <Button type="button" variant="destructive" size="sm">
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      strokeWidth={1.5}
                      className="size-3.5"
                      aria-hidden
                    />
                    Clear
                  </Button>
                }
                title="Remove this photo?"
                description="The dithered result goes with it. Download it first if you want to keep it."
                confirmLabel="Remove photo"
                dismissLabel="Keep it"
                onConfirm={clearImage}
              />
            </div>
          </div>
        ) : null}

        <Card className="relative flex h-[min(60vh,520px)] shrink-0 items-center justify-center overflow-hidden p-4 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink">
          {image ? (
            <DitherPreview
              image={image}
              canvasRef={canvasRef}
              status={status}
              error={error}
              isComparing={isComparing}
            />
          ) : (
            <ImageDropzone onSelect={load} isBusy={isBusy} />
          )}
        </Card>
      </section>

      <Card className="flex min-h-0 flex-col gap-0 overflow-hidden py-0">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="shrink-0 text-sm font-semibold">Controls</h2>
          <LayoutGroup>
            <motion.div layout className="flex min-w-0 flex-1 items-center justify-end gap-1">
              <RailItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" onClick={rollRandom}>
                      <HugeiconsIcon
                        icon={ShuffleSquareIcon}
                        strokeWidth={1.5}
                        className="size-4"
                      />
                      <span className="sr-only">Randomise the look</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Randomise</TooltipContent>
                </Tooltip>
              </RailItem>

              <RailItem>
                <ConfirmActionDialog
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="Reset to the default preset"
                    >
                      <HugeiconsIcon icon={Refresh01Icon} strokeWidth={1.5} className="size-4" />
                    </Button>
                  }
                  title="Reset every control?"
                  description="Your pattern, tone, palette and motion changes go back to the Sepia halftone preset."
                  confirmLabel="Reset controls"
                  dismissLabel="Keep my settings"
                  onConfirm={reset}
                />
              </RailItem>

              <ExportMenu
                image={image?.element ?? null}
                fileName={image?.fileName ?? 'image'}
                settings={settings}
              />
            </motion.div>
          </LayoutGroup>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4">
            <section className="space-y-2" aria-label="Presets">
              <h3 className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Presets
              </h3>
              <PresetPicker activePresetId={activePreset?.id ?? null} onSelect={applyPreset} />
            </section>

            <Separator />

            <Tabs value={controlTab} onValueChange={setControlTab}>
              <AnimatedTabsList
                activeValue={controlTab}
                layoutId="control-tab"
                className="grid w-full grid-cols-4"
              >
                {CONTROL_TABS.map(function renderTab(tab) {
                  return (
                    <AnimatedTabsTrigger key={tab.value} value={tab.value}>
                      <HugeiconsIcon
                        icon={tab.icon}
                        strokeWidth={1.5}
                        className="size-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="truncate">{tab.label}</span>
                    </AnimatedTabsTrigger>
                  )
                })}
              </AnimatedTabsList>

              <TabsContent value="pattern" className="pt-4">
                <PatternControls settings={settings} onPatch={patch} />
              </TabsContent>
              <TabsContent value="tone" className="pt-4">
                <ToneControls settings={settings} onPatch={patch} />
              </TabsContent>
              <TabsContent value="palette" className="pt-4">
                <PaletteControls settings={settings} onPatch={patch} />
              </TabsContent>
              <TabsContent value="motion" className="pt-4">
                <AnimationControls settings={settings} onPatch={patch} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
