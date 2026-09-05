import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase.js'

/**
 * Uploads a user-captured cover photo (from <input type="file" capture>)
 * to Firebase Storage under that user's own folder, and returns a
 * downloadable URL to store on the book document.
 *
 * Storage path mirrors the Firestore ownership model — see storage.rules —
 * so a user can only write into their own uid folder.
 */
export async function uploadCoverPhoto(uid, isbn, file) {
  const path = `users/${uid}/covers/${isbn}-${Date.now()}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' })
  return getDownloadURL(storageRef)
}
