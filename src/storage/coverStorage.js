const DB_NAME = 'book-inventory-covers'
const STORE_NAME = 'covers'
const DB_VERSION = 1

/**
 * Cover photos live in IndexedDB, keyed by ISBN, instead of a cloud
 * bucket — Firebase Storage now requires the paid Blaze plan for new
 * projects, which is off the table for this. Trade-off (agreed as
 * acceptable): a locally-taken cover only shows up on the device that
 * took it. A different device, or this one after clearing site data,
 * just falls back to the initial-letter placeholder — see BookCard /
 * useLocalCover. Firestore never stores the photo itself, only the
 * `coverSource: "local"` flag.
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
