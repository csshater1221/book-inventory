import LibraryList from '../library/LibraryList.jsx'

export default function LibraryPage({ books, loading }) {
  if (loading) {
    return <p className="scan-hint">Loading your library…</p>
  }

  return (
    <div className="library-page">
      <LibraryList books={books} />
    </div>
  )
}
