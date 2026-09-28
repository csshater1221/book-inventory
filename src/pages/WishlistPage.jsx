import { useMemo, useState } from 'react'
import LibraryList from '../library/LibraryList.jsx'
import CorrectionForm from '../correction/CorrectionForm.jsx'
import { searchBooksByText } from '../lookup/searchBooks.js'
import { resolveSeriesAndVolume } from '../lookup/resolveIsbn.js'
import { saveBook, updateBook, deleteBook, isWishlist } from '../library/useLibrary.js'
import { deleteCoverLocally } from '../storage/coverStorage.js'
import { deleteCoverImage } from '../storage/coverSync.js'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Wishlist tab: books you want but don't have yet — a bookstore browse
 * with no money on you right then, or a friend's recommendation with no
 * physical copy (and so no barcode) in hand at all. Two ways in:
 *  - Tap an existing wishlist entry to edit it, same as Library — and
 *    from there, flip the Owned/Wishlist toggle to mark it bought
 *    without needing to rescan (scanning it later does the same thing
 *    automatically — see ScanPage's wishlist-match handling).
 *  - "Find a book" searches Google Books by free text (title/author),
 *    since there's no ISBN to scan for a recommendation with no book in
 *    hand — picking a result opens the same correction form, defaulted
 *    to Wishlist.
 */
export default function WishlistPage({ books, loading }) {
  const { user } = useAuth()
  const [editingBook, setEditingBook] = useState(null)
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [query, setQuery] = useState('')

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const wishlistBooks = useMemo(() => books.filter(isWishlist), [books])

  const filteredBooks = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return wishlistBooks
    return wishlistBooks.filter((book) => {
      return (
        book.title.toLowerCase().includes(trimmed) ||
        (book.author ?? '').toLowerCase().includes(trimmed) ||
        (book.series ?? '').toLowerCase().includes(trimmed)
      )
    })
  }, [wishlistBooks, query])

  // Same reasoning as LibraryPage: autocomplete draws from every book
  // regardless of status, not just the wishlist, since a series is a
  // series either way.
  const existingSeriesNames = useMemo(() => {
    const names = new Set()
    for (const book of books) {
      if (book.series && book.isbn !== editingBook?.isbn) names.add(book.series)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [books, editingBook])

  function openExisting(book) {
    setEditingBook(book)
    setIsEditingExisting(true)
  }

  async function handleSearchSubmit(e) {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (!trimmed) return
    setSearching(true)
    setSearchError(null)
    try {
      const results = await searchBooksByText(trimmed)
      setSearchResults(results)
    } catch (err) {
      console.error('Book search failed', err)
      setSearchError(
        navigator.onLine
          ? 'Search failed — check your connection and try again.'
          : "You're offline — finding a book by title needs a connection."
      )
      setSearchResults(null)
    } finally {
      setSearching(false)
    }
  }

  async function handlePickResult(result) {
    const isbn = result.isbn ?? `manual-${crypto.randomUUID()}`
    const { series, volume } = await resolveSeriesAndVolume(result.isbn, result.title)
    setEditingBook({ ...result, isbn, series, volume, status: 'wishlist' })
    setIsEditingExisting(false)
    setSearchOpen(false)
    setSearchResults(null)
    setSearchQuery('')
  }

  async function handleSave(bookData) {
    if (isEditingExisting) {
      await updateBook(user.uid, bookData)
    } else {
      await saveBook(user.uid, bookData)
    }
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

  function closeForm() {
    setEditingBook(null)
  }

  if (loading) {
    return <p className="scan-hint">Loading your wishlist…</p>
  }

  return (
    <div className="library-page">
      <button type="button" className="primary find-book-button" onClick={() => setSearchOpen(true)}>
        Find a book
      </button>

      {wishlistBooks.length > 0 && (
        <div className="search-bar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your wishlist"
            aria-label="Search your wishlist"
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

      {wishlistBooks.length === 0 ? (
        <div className="empty-state">
          <p>Nothing on your wishlist yet.</p>
          <p>Scan a book and mark it Wishlist, or find one by title above.</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <p className="empty-state">No books match "{query.trim()}".</p>
      ) : (
        <LibraryList books={filteredBooks} onSelectBook={openExisting} />
      )}

      {searchOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box">
            <h2 className="modal-heading">Find a book</h2>
            <form className="wishlist-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Title, author, or both"
                autoFocus
              />
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setSearchOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={searching}>
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
            </form>

            {searchError && <p className="form-error">{searchError}</p>}

            {searchResults && (
              <ul className="search-result-list">
                {searchResults.length === 0 ? (
                  <p className="empty-state">No matches — try a different search.</p>
                ) : (
                  searchResults.map((result, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="search-result"
                        onClick={() => handlePickResult(result)}
                      >
                        <div className="search-result-cover">
                          {result.coverUrl ? (
                            <img src={result.coverUrl} alt="" loading="lazy" />
                          ) : (
                            <div className="book-cover-placeholder" aria-hidden="true">
                              {result.title.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="search-result-meta">
                          <p className="book-title">{result.title}</p>
                          <p className="book-author">{result.author || 'Unknown author'}</p>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {editingBook && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box">
            <h2 className="modal-heading">
              {isEditingExisting ? 'Edit wishlist book' : 'Add to wishlist'}
            </h2>
            <CorrectionForm
              uid={user.uid}
              draft={editingBook}
              existingSeriesNames={existingSeriesNames}
              onSave={handleSave}
              onCancel={closeForm}
              onDelete={isEditingExisting ? handleDelete : undefined}
              submitLabel={isEditingExisting ? 'Save changes' : 'Add to wishlist'}
            />
          </div>
        </div>
      )}
    </div>
  )
}
