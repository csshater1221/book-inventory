import { useMemo, useState } from 'react'
import LibraryList from '../library/LibraryList.jsx'
import CorrectionForm from '../correction/CorrectionForm.jsx'
import { updateBook, deleteBook } from '../library/useLibrary.js'
import { deleteCoverLocally } from '../storage/coverStorage.js'
import { deleteCoverImage } from '../storage/coverSync.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function LibraryPage({ books, loading }) {
  const { user } = useAuth()
  const [editingBook, setEditingBook] = useState(null)

  // Same autocomplete source as ScanPage — series names already present
  // in the library, minus the book currently being edited (no point
  // suggesting a book's own current series name back to itself).
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
      <LibraryList books={books} onSelectBook={setEditingBook} />

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
