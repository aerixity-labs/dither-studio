'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  applyDither,
  canAnimate,
  getRenderSize,
  prepareSource,
  type DitherRequest,
  type DitherResponse,
  type DitherSettings,
  type PixelBuffer,
  type SourceImage,
} from '@/lib/dither/core'

/**
 * Builds the worker from the core module, which doubles as the worker entry.
 *
 * Kept here rather than in the core so that file never references its own URL,
 * which bundlers handle inconsistently. Returns null where workers are
 * unavailable so the hook can fall back to the main thread.
 */
function createDitherWorker() {
  if (typeof Worker === 'undefined') return null

  try {
    return new Worker(new URL('../lib/dither/core.ts', import.meta.url), {
      type: 'module',
    })
  } catch (error: unknown) {
    console.warn('Dither worker unavailable, falling back to the main thread.', error)
    return null
  }
}

export type RenderStatus = 'idle' | 'preparing' | 'rendering' | 'ready' | 'error'

type Options = {
  image: SourceImage | null
  settings: DitherSettings
  maxRenderSize: number
  onRenderComplete?: (canvas: HTMLCanvasElement) => void
  onError?: (error: Error) => void
}

type Result = {
  /**
   * A callback ref rather than a ref object, so the hook learns when the canvas is
   * re-attached and repaints. A ref object cannot trigger an effect, so a remounted canvas
   * would stay blank.
   */
  canvasRef: (node: HTMLCanvasElement | null) => void
  status: RenderStatus
  error: string | null
  /** Intrinsic size of the render buffer, which is also the export size. */
  size: { width: number; height: number } | null
}

/**
 * Drives a canvas from a source image and dither settings.
 *
 * Rendering happens in a worker whenever one can be constructed, with a
 * synchronous main-thread path as the fallback.
 *
 * Only one frame is ever in flight. An animation tick that arrives while the
 * worker is busy is dropped, because the next tick will ask again, which lets a
 * slow device degrade to a lower frame rate instead of building a queue. A
 * one-off render is instead held as a pending frame and issued the moment the
 * worker frees up, so the canvas always ends up showing the current settings.
 */
export function useDitherRender(options: Options): Result {
  const { image, settings, maxRenderSize, onRenderComplete, onError } = options

  const canvasNodeRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasVersion, setCanvasVersion] = useState(0)
  const sourceRef = useRef<PixelBuffer | null>(null)
  const frameRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)
  const inFlightRef = useRef(false)
  const pendingTimeRef = useRef<number | null>(null)
  const completeRef = useRef(onRenderComplete)
  const errorRef = useRef(onError)
  const settingsRef = useRef(settings)

  /**
   * Compared by value: callers routinely build the settings object inline, so depending on
   * its identity would re-run the render effect on every commit and spin forever against the
   * `setStatus` each finished frame triggers.
   */
  const settingsKey = JSON.stringify(settings)

  const [worker, setWorker] = useState<Worker | null>(null)
  const [isWorkerResolved, setIsWorkerResolved] = useState(false)
  const [status, setStatus] = useState<RenderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  /** Declared before the render effect, so the refs are current when it reads them. */
  useEffect(
    function trackLatest() {
      completeRef.current = onRenderComplete
      errorRef.current = onError
      settingsRef.current = settings
    },
    [onRenderComplete, onError, settings],
  )

  const paint = useCallback(function paint(frame: PixelBuffer) {
    const canvas = canvasNodeRef.current
    if (!canvas) return

    if (canvas.width !== frame.width || canvas.height !== frame.height) {
      canvas.width = frame.width
      canvas.height = frame.height
    }

    const context = canvas.getContext('2d')
    if (!context) return

    context.putImageData(new ImageData(frame.data, frame.width, frame.height), 0, 0)
    completeRef.current?.(canvas)
  }, [])

  const canvasRef = useCallback(function attachCanvas(node: HTMLCanvasElement | null) {
    canvasNodeRef.current = node
    /** Only an attach needs a repaint; a detach is just teardown. */
    if (node)
      setCanvasVersion(function bump(version) {
        return version + 1
      })
  }, [])

  const fail = useCallback(function fail(message: string) {
    setStatus('error')
    setError(message)
    errorRef.current?.(new Error(message))
  }, [])

  /**
   * Owns the worker. `isWorkerResolved` lets the dependent effects wait for the
   * one-off construction attempt instead of racing it and silently taking the
   * main-thread path on first mount.
   */
  useEffect(function manageWorker() {
    const created = createDitherWorker()
    setWorker(created)
    setIsWorkerResolved(true)

    return function teardown() {
      created?.terminate()
      setWorker(null)
    }
  }, [])

  /**
   * Renders one frame. `isDroppable` marks a frame the caller will naturally ask
   * for again – an animation tick – so it can be discarded while the worker is
   * busy. Anything else is queued rather than dropped.
   *
   * Settings are read at post time, so a queued frame renders the newest
   * settings rather than the ones in force when it was queued.
   */
  const requestFrame = useCallback(
    function requestFrame(time: number, isDroppable = false) {
      const source = sourceRef.current
      if (!source) return
      const currentSettings = settingsRef.current

      if (!worker) {
        try {
          paint(applyDither(source, currentSettings, time))
          setStatus('ready')
          /** Matches the worker path: without this a transient failure pins the alert open. */
          setError(null)
        } catch (caught: unknown) {
          fail(caught instanceof Error ? caught.message : 'Dithering failed.')
        }
        return
      }

      if (inFlightRef.current) {
        if (!isDroppable) pendingTimeRef.current = time
        return
      }

      inFlightRef.current = true
      pendingTimeRef.current = null
      requestIdRef.current += 1
      const message: DitherRequest = {
        type: 'render',
        id: requestIdRef.current,
        settings: currentSettings,
        time,
      }
      worker.postMessage(message)
    },
    [worker, paint, fail],
  )

  useEffect(
    function listenForFrames() {
      if (!worker) return

      function drainPending() {
        const pending = pendingTimeRef.current
        if (pending === null) return
        pendingTimeRef.current = null
        requestFrame(pending)
      }

      function onMessage(event: MessageEvent<DitherResponse>) {
        const response = event.data
        inFlightRef.current = false

        if (response.id !== requestIdRef.current) {
          drainPending()
          return
        }

        if (!response.ok) {
          fail(response.message)
          drainPending()
          return
        }

        paint({
          width: response.width,
          height: response.height,
          data: new Uint8ClampedArray(response.pixels),
        })
        setStatus('ready')
        setError(null)
        drainPending()
      }

      function onWorkerError(event: ErrorEvent) {
        inFlightRef.current = false
        fail(event.message || 'The dither worker stopped unexpectedly.')
      }

      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onWorkerError)

      return function teardown() {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onWorkerError)
      }
    },
    [worker, paint, fail, requestFrame],
  )

  useEffect(
    function uploadSource() {
      if (!isWorkerResolved) return

      if (!image) {
        sourceRef.current = null
        setSize(null)
        setStatus('idle')
        setError(null)
        return
      }

      setStatus('preparing')
      setError(null)

      try {
        const target = getRenderSize(image, maxRenderSize)
        const source = prepareSource(image, target.width, target.height)
        sourceRef.current = source
        inFlightRef.current = false
        pendingTimeRef.current = null

        if (worker) {
          const copy = new Uint8ClampedArray(source.data)
          const message: DitherRequest = {
            type: 'source',
            width: source.width,
            height: source.height,
            pixels: copy.buffer,
          }
          worker.postMessage(message, [copy.buffer])
        }

        setSize(target)
      } catch (caught: unknown) {
        const message =
          caught instanceof Error
            ? caught.message
            : 'The image could not be read. It may be blocked by CORS.'
        sourceRef.current = null
        fail(message)
      }
    },
    [image, maxRenderSize, worker, isWorkerResolved, fail],
  )

  /**
   * Renders on every settings change, and continuously while animating. The
   * animation clock is `performance.now()` rather than an elapsed offset, so
   * changing a control mid-animation cannot make the pattern jump.
   */
  useEffect(
    function render() {
      if (!size) return

      if (!canAnimate(settingsRef.current)) {
        setStatus('rendering')
        requestFrame(0)
        return
      }

      function tick(now: number) {
        requestFrame(now / 1000, true)
        frameRef.current = requestAnimationFrame(tick)
      }

      frameRef.current = requestAnimationFrame(tick)

      return function stop() {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    },
    [size, settingsKey, requestFrame, canvasVersion],
  )

  return { canvasRef, status, error, size }
}
