import { useEffect, useState } from 'react'
import { getCoverLocally, saveCoverLocally } from './coverStorage.js'
import { fetchCoverImage } from './coverSync.js'

/**
 * Resolves a book's photo cover to a displayable URL, cache-first:
 * this device's IndexedDB cache, then — on a miss, e.g. a different
 * device, or this one after clearing site data — the synced copy in
 * Firestore (see coverSync.js), which gets written back into IndexedDB
 * so it's local on this device from then on.
 *
 * Returns null while loading, while absent everywhere, or when enabled
 * is false — callers treat null the same as "no cover" and fall back to
 * the placeholder.
 */
export function useCover(uid, isbn, enabled) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setUrl(null)
      return
    }

    let objectUrl = null
    let cancelled = false

    async function resolve() {
      const cachedBlob = await getCoverLocally(isbn).catch(() => null)
      if (cachedBlob) {
        if (cancelled) return
        objectUrl = URL.createObjectURL(cachedBlob)
        setUrl(objectUrl)
        return
      }

      const dataUrl = await fetchCoverImage(uid, isbn).catch((err) => {
        console.warn('Could not fetch synced cover', err)
        return null
      })
      if (!dataUrl || cancelled) return

      const blob = await (await fetch(dataUrl)).blob()
      await saveCoverLocally(isbn, blob).catch(() => {})
      if (cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }

    resolve()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [uid, isbn, enabled])

  return url
}
