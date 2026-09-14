const DB_NAME = 'readr-covers'
const STORE_NAME = 'covers'
const DB_VERSION = 1

/**
 * Local IndexedDB cache for cover photos, keyed by ISBN. This is the
 * fast path — checked before ever touching the network (see
 * useCover.js) — but it's no longer the only copy: the source of truth
 * now lives in Firestore (see coverSync.js), and this cache is filled in
 * from there on a miss. Clearing site data or using a different device
 * just means the next view re-fetches from Firestore instead of failing
 * outright, unlike the original device-only design.
 */
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveCoverLocally(isbn, blob) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, isbn)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCoverLocally(isbn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(isbn)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteCoverLocally(isbn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(isbn)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
