import { groupBooks } from './groupBooks.js'
import BookCard from './BookCard.jsx'

export default function LibraryList({ books, onSelectBook }) {
  if (books.length === 0) {
    return (
      <div className="empty-state">
        <p>Nothing scanned yet.</p>
        <p>Scan a book's barcode to start your library.</p>
      </div>
    )
  }

  const groups = groupBooks(books)

  return (
    <div className="library-list">
      {groups.map((group) => (
        <section key={group.name} className="library-group">
          <h2 className="library-group-heading">{group.name}</h2>
          <ul className="book-grid">
            {group.books.map((book) => (
              <BookCard key={book.id} book={book} onSelect={onSelectBook} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
