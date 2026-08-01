import { useCallback, useEffect, useReducer, useRef } from 'react'

import {
  DEFAULT_LOOK_PRESET_ID,
  LOOK_PRESETS,
  RANDOM_INVERT_CHANCE,
  RANDOM_RANGES,
  type SliderRange,
} from '@/constants/dither'
import { MAX_PALETTE_COLORS, MIN_PALETTE_COLORS } from '@/constants/palettes'
import { SETTINGS_WRITE_DEBOUNCE_MS } from '@/constants/persistence'
import {
  AnimationMode,
  DEFAULT_DITHER_SETTINGS,
  DitherPattern,
  isErrorDiffusion,
  type DitherSettings,
} from '@/lib/dither/core'
import { readStoredSettings, writeStoredSettings } from '@/lib/persistence/settings-storage'

type Action =
  | { type: 'patch'; patch: Partial<DitherSettings> }
  | { type: 'preset'; presetId: string }
  | { type: 'randomize' }
  | { type: 'reset' }
  | { type: 'replace'; settings: DitherSettings }

function getPresetSettings(presetId: string) {
  const preset = LOOK_PRESETS.find(function byId(candidate) {
    return candidate.id === presetId
  })
  return preset?.settings ?? DEFAULT_DITHER_SETTINGS
}

function pickRandom<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)]
}

function pickInRange(range: SliderRange) {
  const value = range.min + Math.random() * (range.max - range.min)
  return Math.round(value / range.step) * range.step
}

/**
 * Randomises the look while keeping the source palette. Error-diffusion patterns are
 * excluded so a roll of the dice cannot silently disable animation.
 */
function randomize(state: DitherSettings): DitherSettings {
  const animatablePatterns = Object.values(DitherPattern).filter(function isAnimatable(pattern) {
    return !isErrorDiffusion(pattern)
  })

  return {
    ...state,
    pattern: pickRandom(animatablePatterns),
    cellSize: pickInRange(RANDOM_RANGES.cellSize),
    threshold: pickInRange(RANDOM_RANGES.threshold),
    contrast: pickInRange(RANDOM_RANGES.contrast),
    gamma: pickInRange(RANDOM_RANGES.gamma),
    invert: Math.random() < RANDOM_INVERT_CHANCE,
    animationMode: pickRandom(Object.values(AnimationMode)),
  }
}

function reducer(state: DitherSettings, action: Action): DitherSettings {
  if (action.type === 'reset') return getPresetSettings(DEFAULT_LOOK_PRESET_ID)
  if (action.type === 'preset') return getPresetSettings(action.presetId)
  if (action.type === 'randomize') return randomize(state)
  /** Already validated and canonicalised by `parseStoredSettings`. */
  if (action.type === 'replace') return action.settings

  const next = { ...state, ...action.patch }

  if (next.palette.length < MIN_PALETTE_COLORS) return state
  if (next.palette.length > MAX_PALETTE_COLORS) {
    return { ...next, palette: next.palette.slice(0, MAX_PALETTE_COLORS) }
  }

  return next
}

export function useDitherSettings() {
  /** Seeded with the default preset so the first client render matches the prerender. */
  const [settings, dispatch] = useReducer(reducer, getPresetSettings(DEFAULT_LOOK_PRESET_ID))
  const latestRef = useRef(settings)
  const isHydratedRef = useRef(false)

  useEffect(
    function trackLatest() {
      latestRef.current = settings
    },
    [settings],
  )

  /**
   * Restore and the reduced-motion default share one effect: they conflict, and split
   * across two the outcome would depend on registration order.
   *
   * A stored `animated: true` from a reduced-motion visitor is an explicit choice made
   * after this ran, so it is honoured. The OS preference still governs interface chrome,
   * which reads it directly.
   */
  useEffect(function restoreStoredSettings() {
    const stored = readStoredSettings()

    if (stored) {
      dispatch({ type: 'replace', settings: stored })
    } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dispatch({ type: 'patch', patch: { animated: false } })
    }

    isHydratedRef.current = true
  }, [])

  /**
   * Debounced because dragging a slider dispatches per pointer move and `setItem` is a
   * synchronous write competing with the render loop. The ref gate keeps the initial
   * default from landing on top of a restore; the effect above runs first, so a restored
   * look still persists.
   */
  useEffect(
    function persistSettings() {
      if (!isHydratedRef.current) return

      const timer = window.setTimeout(function write() {
        writeStoredSettings(settings)
      }, SETTINGS_WRITE_DEBOUNCE_MS)

      return function cancel() {
        window.clearTimeout(timer)
      }
    },
    [settings],
  )

  /**
   * The debounce is cancelled on unmount, so a tab closed mid-drag would lose its last
   * edit. Both events are bound because iOS Safari can skip `pagehide`; the write is
   * idempotent, so firing twice costs nothing.
   */
  useEffect(function flushOnHide() {
    function flush() {
      if (isHydratedRef.current) writeStoredSettings(latestRef.current)
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return function unbind() {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const patch = useCallback(function patch(value: Partial<DitherSettings>) {
    dispatch({ type: 'patch', patch: value })
  }, [])

  const applyPreset = useCallback(function applyPreset(presetId: string) {
    dispatch({ type: 'preset', presetId })
  }, [])

  const reset = useCallback(function reset() {
    dispatch({ type: 'reset' })
  }, [])

  const rollRandom = useCallback(function rollRandom() {
    dispatch({ type: 'randomize' })
  }, [])

  return { settings, patch, applyPreset, reset, rollRandom }
}
