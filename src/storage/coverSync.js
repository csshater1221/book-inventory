import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

/**
 * Stores/retrieves cover photos as base64 in their own per-image doc —
 * users/{uid}/coverImages/{isbn} — deliberately kept out of the book's
 * own doc in the `books` collection. The library view's real-time
 * listener only ever attaches to `books`; embedding image data there
 * would mean every scan or edit anywhere re-sends every cover's bytes to
 * every open tab on every device. Keeping images in their own
 * collection means each one is only ever fetched on demand, once per
 * device (see useCover.js, which checks the IndexedDB cache first and
 * only falls through to this module on a miss).
 *
 * Images are resized/compressed client-side (see resizeCoverImage.js)
 * before they ever reach this module, so a typical cover is tens of KB
 * — comfortably inside Firestore's 1 MiB per-document limit even after
 * base64's ~33% size inflation.
 */
function coverImageDoc(uid, isbn) {
  return doc(db, 'users', uid, 'coverImages', isbn)
}

export async function uploadCoverImage(uid, isbn, dataUrl) {
  await setDoc(coverImageDoc(uid, isbn), { dataUrl, updatedAt: Date.now() })
}

export async function fetchCoverImage(uid, isbn) {
  const snap = await getDoc(coverImageDoc(uid, isbn))
  return snap.exists() ? snap.data().dataUrl : null
}

export async function deleteCoverImage(uid, isbn) {
  await deleteDoc(coverImageDoc(uid, isbn))
}
