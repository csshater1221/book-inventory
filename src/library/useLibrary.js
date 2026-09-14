import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
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
  // A "photo" cover's book.coverUrl (if any) is a blob: URL, only valid
  // in this tab for this session — the real image lives in IndexedDB
  // (local cache) and Firestore's coverImages collection (synced source
  // of truth), keyed by ISBN in both — see coverStorage.js/coverSync.js.
  // The book doc itself only needs to know a photo cover exists;
  // BookCard/CorrectionForm resolve the actual image via useCover.js,
  // falling back to the placeholder if it's absent everywhere.
  const coverUrl = book.coverSource === 'photo' ? null : book.coverUrl || null

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

/**
 * Updates an existing book's editable fields from the correction form,
 * reused for editing a book from the library view. Deliberately uses
 * updateDoc (not saveBook's setDoc) so it never touches createdAt or
 * scanCount — those describe when/how often the book was first added,
 * not this edit.
 */
export async function updateBook(uid, book) {
  const coverUrl = book.coverSource === 'photo' ? null : book.coverUrl || null

  await updateDoc(bookDoc(uid, book.isbn), {
    title: book.title.trim(),
    author: book.author.trim(),
    series: book.series?.trim() || null,
    volume: book.volume === '' || book.volume == null ? null : Number(book.volume),
    coverUrl,
    coverSource: book.coverSource || 'none'
  })
}

/**
 * Removes a book from the library entirely. Callers are responsible for
 * also clearing its local cover blob (see deleteCoverLocally in
 * coverStorage.js) if coverSource was "local" — this only touches
 * Firestore.
 */
export async function deleteBook(uid, isbn) {
  await deleteDoc(bookDoc(uid, isbn))
}
