export default function BookCard({ book }) {
  return (
    <li className="book-card">
      <div className="book-cover">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt="" loading="lazy" />
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
