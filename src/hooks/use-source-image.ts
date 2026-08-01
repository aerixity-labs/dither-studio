import { useCallback, useEffect, useRef, useState } from 'react'

import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '@/constants/dither'
import { clearStoredImage, loadStoredImage, saveStoredImage } from '@/lib/persistence/image-storage'

export type LoadedImage = {
  element: HTMLImageElement
  fileName: string
  width: number
  height: number
  /** Object URL for the untouched original, used by the before/after view. */
  objectUrl: string
}

type DecodedFile = {
  element: HTMLImageElement
  objectUrl: string
  width: number
  height: number
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function validate(file: File) {
  const isAcceptedType = ACCEPTED_IMAGE_TYPES.some(function matches(type) {
    return type === file.type
  })

  if (!isAcceptedType) {
    return `${file.name || 'That file'} is not a supported image. Use PNG, JPEG, WebP, GIF or AVIF.`
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `That image is ${formatMegabytes(file.size)}. The limit is ${formatMegabytes(MAX_UPLOAD_BYTES)}.`
  }

  return null
}

/**
 * Turns a file into a fully decoded image element.
 *
 * Awaiting `decode()` is not belt-and-braces: the render pipeline draws the element to a
 * canvas the moment it arrives, and `drawImage` on an element that has loaded but not
 * decoded produces a transparent frame with no error at all.
 *
 * Every failure path revokes the URL it created, so a rejection never leaks.
 */
function decodeFile(file: File): Promise<DecodedFile> {
  return new Promise(function attempt(resolve, reject) {
    const objectUrl = URL.createObjectURL(file)
    const element = new Image()

    function fail(message: string) {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(message))
    }

    element.addEventListener('load', async function onLoad() {
      if (element.naturalWidth === 0 || element.naturalHeight === 0) {
        fail('That image reported no dimensions and could not be read.')
        return
      }

      try {
        await element.decode?.()
      } catch {
        fail('That image could not be decoded. It may be corrupt.')
        return
      }

      resolve({
        element,
        objectUrl,
        width: element.naturalWidth,
        height: element.naturalHeight,
      })
    })

    element.addEventListener('error', function onError() {
      fail('That image could not be decoded. It may be corrupt.')
    })

    element.src = objectUrl
  })
}

type Options = {
  /**
   * Called on every rejected file. A callback rather than error state because two
   * identical rejections in a row must both report, and state would dedupe the second.
   */
  onError: (message: string) => void
}

/**
 * Decodes an uploaded file into an image element, revoking the previous object URL so
 * repeated uploads cannot leak blobs for the lifetime of the tab.
 *
 * The last upload is also kept in IndexedDB for the tab's session, so a reload does not
 * throw the user's work away. Storage failures are never surfaced: persistence is a
 * convenience, and a browser that refuses it behaves as though the feature were absent.
 */
export function useSourceImage(options: Options) {
  const [image, setImage] = useState<LoadedImage | null>(null)
  /** Covers both an upload decode and the restore, which no caller distinguishes. */
  const [isBusy, setIsBusy] = useState(false)
  const currentUrlRef = useRef<string | null>(null)
  /** A real upload or an explicit clear always outranks an in-flight restore. */
  const hasUserActedRef = useRef(false)

  const onErrorRef = useRef(options.onError)
  useEffect(function trackOnError() {
    onErrorRef.current = options.onError
  })

  const release = useCallback(function release() {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = null
    }
  }, [])

  const adopt = useCallback(
    function adopt(decoded: DecodedFile, fileName: string) {
      release()
      currentUrlRef.current = decoded.objectUrl
      setImage({
        element: decoded.element,
        fileName,
        width: decoded.width,
        height: decoded.height,
        objectUrl: decoded.objectUrl,
      })
    },
    [release],
  )

  useEffect(
    function revokeOnUnmount() {
      return release
    },
    [release],
  )

  /**
   * Registered after the revoke effect above so that, under StrictMode's
   * mount → unmount → remount, the interleaved cleanup runs while `currentUrlRef` is
   * still empty. The cleanup here deliberately does not revoke: a URL that reached the
   * ref belongs to `release`, and revoking it would kill the one the surviving pass just
   * adopted.
   */
  useEffect(
    function restoreStoredImage() {
      let isCancelled = false

      async function restore() {
        const file = await loadStoredImage()
        if (isCancelled || !file || hasUserActedRef.current) return

        /** A record can outlive a change to the accepted types or size limit. */
        if (validate(file)) {
          await clearStoredImage()
          return
        }

        let decoded: DecodedFile

        try {
          decoded = await decodeFile(file)
        } catch {
          await clearStoredImage()
          return
        }

        /** Lost the race, so this pass owns the URL it created. */
        if (isCancelled || hasUserActedRef.current) {
          URL.revokeObjectURL(decoded.objectUrl)
          return
        }

        adopt(decoded, file.name)
      }

      setIsBusy(true)

      void restore().finally(function settle() {
        if (!isCancelled) setIsBusy(false)
      })

      return function cancelRestore() {
        isCancelled = true
      }
    },
    [adopt],
  )

  const load = useCallback(
    function load(file: File) {
      hasUserActedRef.current = true

      const validationError = validate(file)
      if (validationError) {
        onErrorRef.current(validationError)
        return
      }

      setIsBusy(true)

      async function run() {
        let decoded: DecodedFile

        try {
          decoded = await decodeFile(file)
        } catch (caught: unknown) {
          setIsBusy(false)
          onErrorRef.current(
            caught instanceof Error ? caught.message : 'That image could not be read.',
          )
          return
        }

        adopt(decoded, file.name)
        setIsBusy(false)
        /** Not awaited: a 25 MB write must not hold up the preview. */
        void saveStoredImage(file)
      }

      void run()
    },
    [adopt],
  )

  const clear = useCallback(
    function clear() {
      hasUserActedRef.current = true
      release()
      setImage(null)
      /** Settings are left alone; Reset owns those. */
      void clearStoredImage()
    },
    [release],
  )

  return { image, isBusy, load, clear }
}
