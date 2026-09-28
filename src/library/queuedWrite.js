/**
 * Firestore writes only resolve once the SERVER acknowledges them — with
 * offline persistence on, a write made with no connection is applied to
 * the local copy immediately (the UI updates right away) and queued, but
 * its promise stays pending until the connection returns. Awaiting that
 * directly would leave every "Saving…" button stuck for the whole time
 * you're offline.
 *
 * queuedWrite waits for the acknowledgement only briefly. If it hasn't
 * arrived — offline, or a connection too slow to count — it resolves
 * anyway, since the write is safely queued locally, and just logs if the
 * server later rejects it. When online and healthy the ack arrives well
 * inside the window, so real errors (e.g. a rules rejection) still
 * surface to the caller normally.
 */
const ACK_WAIT_MS = 2500

export function queuedWrite(writePromise) {
  return new Promise((resolve, reject) => {
    const waitMs = typeof navigator !== 'undefined' && navigator.onLine === false ? 0 : ACK_WAIT_MS

    const timer = setTimeout(() => {
      writePromise.catch((err) => console.error('Queued write failed after sync', err))
      resolve()
    }, waitMs)

    writePromise.then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}
