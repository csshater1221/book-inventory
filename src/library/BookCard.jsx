import { useLocalCover } from '../storage/useLocalCover.js'

export default function BookCard({ book }) {
  // API covers are stored directly on the doc. Local covers (taken with
  // the device camera) are only ever in this device's IndexedDB — a
  // different device, or this one after clearing site data, resolves to
  // null here and falls back to the placeholder below.
  const localCoverUrl = useLocalCover(book.isbn, book.coverSource === 'local')
  const coverUrl = book.coverUrl || localCoverUrl

  return (
    <li className="book-card">
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
    </li>
  )
}
