import { useEffect, useState } from 'react'
import { getCoverLocally } from './coverStorage.js'

/**
 * Resolves a book's local cover (if any) to a displayable object URL.
 * Returns null while loading, while absent, or if this device never
 * had the photo (different device, or local storage was cleared) —
 * callers treat null the same as "no cover" and fall back to the
 * placeholder.
 */
export function useLocalCover(isbn, enabled) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setUrl(null)
      return
    }

    let objectUrl = null
    let cancelled = false

    getCoverLocally(isbn)
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((err) => {
        console.warn('Could not read local cover', err)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isbn, enabled])

  return url
}
