import { useMemo, useState } from 'react'
import LibraryList from '../library/LibraryList.jsx'
import CorrectionForm from '../correction/CorrectionForm.jsx'
import { updateBook, deleteBook, isOwned } from '../library/useLibrary.js'
import { deleteCoverLocally } from '../storage/coverStorage.js'
import { deleteCoverImage } from '../storage/coverSync.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function LibraryPage({ books, loading }) {
  const { user } = useAuth()
  const [editingBook, setEditingBook] = useState(null)
  const [query, setQuery] = useState('')

  // `books` is the whole collection (owned + wishlist) — only the owned
  // ones show up here; WishlistPage does the mirror-image filter.
  const ownedBooks = useMemo(() => books.filter(isOwned), [books])

  // Client-side filter — the whole library's already loaded in memory for
  // grouping/sorting (see useLibrary.js), and a personal collection is
  // small enough that this is instant on every keystroke with no need
  // for debouncing or a server-side query.
  const filteredBooks = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return ownedBooks
    return ownedBooks.filter((book) => {
      return (
        book.title.toLowerCase().includes(trimmed) ||
        (book.author ?? '').toLowerCase().includes(trimmed) ||
        (book.series ?? '').toLowerCase().includes(trimmed)
      )
    })
  }, [ownedBooks, query])

  // Autocomplete source stays keyed off every book regardless of status
  // (owned or wishlist) and off the full unfiltered list, not the
  // search-filtered view — a series is a series either way, and
  // searching for "mistborn" shouldn't narrow which series names show up
  // when editing a book you found that way.
  const existingSeriesNames = useMemo(() => {
    const names = new Set()
    for (const book of books) {
      if (book.series && book.isbn !== editingBook?.isbn) names.add(book.series)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [books, editingBook])

  async function handleSave(bookData) {
    await updateBook(user.uid, bookData)
    setEditingBook(null)
  }

  async function handleDelete() {
    await deleteBook(user.uid, editingBook.isbn)
    if (editingBook.coverSource === 'photo') {
      await deleteCoverLocally(editingBook.isbn).catch(() => {})
      await deleteCoverImage(user.uid, editingBook.isbn).catch(() => {})
    }
    setEditingBook(null)
  }

  if (loading) {
    return <p className="scan-hint">Loading your library…</p>
  }

  return (
    <div className="library-page">
      {ownedBooks.length > 0 && (
        <div className="search-bar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library"
            aria-label="Search your library"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      )}

      {ownedBooks.length > 0 && filteredBooks.length === 0 ? (
        <p className="empty-state">No books match "{query.trim()}".</p>
      ) : (
        <LibraryList books={filteredBooks} onSelectBook={setEditingBook} />
      )}

      {editingBook && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box">
            <h2 className="modal-heading">Edit book</h2>
            <CorrectionForm
              uid={user.uid}
              draft={editingBook}
              existingSeriesNames={existingSeriesNames}
              onSave={handleSave}
              onCancel={() => setEditingBook(null)}
              onDelete={handleDelete}
              submitLabel="Save changes"
            />
          </div>
        </div>
      )}
    </div>
  )
}
