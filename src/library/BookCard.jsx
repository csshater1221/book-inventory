import { useCover } from '../storage/useCover.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function BookCard({ book, onSelect }) {
  const { user } = useAuth()
  // API covers are stored directly on the doc. Photo covers are resolved
  // cache-first: this device's IndexedDB, then the synced Firestore copy
  // on a miss (different device, or cleared site data) — see useCover.js.
  const photoCoverUrl = useCover(user.uid, book.isbn, book.coverSource === 'photo')
  const coverUrl = book.coverUrl || photoCoverUrl

  return (
    <li className="book-card-item">
      <button type="button" className="book-card" onClick={() => onSelect(book)}>
        <div className="book-cover">
          {coverUrl ? (
            <img src={coverUrl} alt="" loading="lazy" />
          ) : (
            <div className="book-cover-placeholder" aria-hidden="true">
              {book.title.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="book-meta">
          <p className="book-title">
            {book.title}
            {book.volume != null && <span className="book-volume"> · Vol. {book.volume}</span>}
          </p>
          <p className="book-author">{book.author || 'Unknown author'}</p>
        </div>
      </button>
    </li>
  )
}
