const DEFAULT_TIMEOUT_MS = 5000

/**
 * fetch() with a hard timeout, and an immediate failure when the browser
 * already knows it's offline. On a spotty connection a plain fetch can
 * hang for a very long time before giving up, which would leave the
 * scanner sitting on "Looking up this ISBN…" while you stand in a store.
 * Every lookup caller already treats a thrown error as "no result" and
 * falls through to the next source or to manual entry, so failing fast
 * here just gets you to the form sooner.
 */
export async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('offline')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
