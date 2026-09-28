import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

// All values come from .env.local (see .env.local.example).
// Firebase web config is not secret — it's fine to ship in the client
// bundle — access control lives in firestore.rules.
//
// No Firebase Storage here: new projects require the paid Blaze plan for
// Storage now, so cover photos are synced through Firestore instead (see
// src/storage/coverSync.js).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Offline support: Firestore keeps a persistent copy of everything it has
// read in IndexedDB. With this on, the library listener in useLibrary.js
// serves straight from that local copy when there's no connection (or a
// connection too flaky to be useful), and writes made offline are queued
// and sent automatically once the connection comes back. The multi-tab
// manager lets several open tabs/windows share that one local copy.
//
// If persistence can't start (some private-browsing modes block
// IndexedDB), or Firestore was already initialized (hot reload in dev),
// fall back to whatever instance already exists instead of crashing —
// the app still works online, just without the offline copy.
let firestore
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  })
} catch (err) {
  console.warn('Firestore offline persistence unavailable, using default cache', err)
  firestore = getFirestore(app)
}
export const db = firestore
