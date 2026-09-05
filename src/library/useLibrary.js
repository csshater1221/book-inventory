import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../firebase.js'

function booksCollection(uid) {
  return collection(db, 'users', uid, 'books')
}

function bookDoc(uid, isbn) {
  return doc(db, 'users', uid, 'books', isbn)
}

/**
 * Real-time subscription to the signed-in user's full library.
 * The library is small (a personal collection, not a store catalog), so
 * loading the whole thing client-side and grouping/sorting in memory
 * (see groupBooks.js) is simpler than paginated queries.
 */
export function useLibrary(uid) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setBooks([])
      setLoading(false)
      return
    }
    const unsubscribe = onSnapshot(booksCollection(uid), (snapshot) => {
      setBooks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsubscribe
  }, [uid])

  return { books, loading }
}

/**
 * Checks whether the user already has this ISBN, without waiting on
 * lookup APIs — this is what powers "already in your library" and lets
 * us skip the lookup cascade entirely on a repeat scan.
 */
export async function findExistingBook(uid, isbn) {
  const snap = await getDoc(bookDoc(uid, isbn))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Bumps the silent scan counter on an existing book. Never shown in the
 * UI — it exists only in case it's useful later (e.g. "most re-scanned").
 */
export async function bumpScanCount(uid, isbn) {
  await updateDoc(bookDoc(uid, isbn), { scanCount: increment(1) })
}

/**
 * Saves a book after the user confirms/corrects it on the correction
 * screen. Keyed by ISBN so re-saving the same ISBN overwrites rather than
 * duplicating.
 */
export async function saveBook(uid, book) {
  // A "local" cover's coverUrl is a blob: URL, only valid in this tab for
  // this session — the actual photo lives in IndexedDB (see coverStorage.js),
  // keyed by ISBN. Firestore only needs to know a local cover exists;
  // BookCard resolves the real image on each device separately via
  // useLocalCover, falling back to the placeholder where it's absent.
  const coverUrl = book.coverSource === 'local' ? null : book.coverUrl || null

  await setDoc(bookDoc(uid, book.isbn), {
    isbn: book.isbn,
    title: book.title.trim(),
    author: book.author.trim(),
    series: book.series?.trim() || null,
    volume: book.volume === '' || book.volume == null ? null : Number(book.volume),
    coverUrl,
    coverSource: book.coverSource || 'none',
    source: book.source,
    scanCount: 1,
    createdAt: serverTimestamp()
  })
}
