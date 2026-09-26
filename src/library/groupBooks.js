const STANDALONE_LABEL = 'Standalone'

/**
 * Groups books by series name (books with no series land in a shared
 * "Standalone" bucket), then sorts:
 *  - groups alphabetically by name, with Standalone always sorted in its
 *    normal alphabetical position rather than pinned to an end
 *  - books within a series by volume ascending (nulls last)
 *  - books within Standalone alphabetically by title
 *
 * Grouping itself is case-insensitive — "Mistborn" and "mistborn" land in
 * the same group, since series names are typed by hand (or guessed by
 * parseSeriesAndVolume.js) and easy to enter with different casing across
 * different scans of the same series. The display name shown as the
 * group heading is whichever casing was seen first among that series'
 * books; it doesn't need to be authoritative, since editing any book's
 * series field to fix the casing is a normal part of using the app.
 *
 * Returns an array of { name, books } ready to render as sections.
 */
export function groupBooks(books) {
  const groups = new Map() // normalized key -> { displayName, books }

  for (const book of books) {
    const rawSeries = book.series?.trim()
    const displayName = rawSeries || STANDALONE_LABEL
    const key = displayName.toLowerCase()

    if (!groups.has(key)) {
      groups.set(key, { displayName, books: [] })
    }
    groups.get(key).books.push(book)
  }

  const sortedKeys = [...groups.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  return sortedKeys.map((key) => {
    const { displayName, books: groupBooksList } = groups.get(key)

    if (key === STANDALONE_LABEL.toLowerCase()) {
      groupBooksList.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      )
    } else {
      groupBooksList.sort((a, b) => {
        if (a.volume == null && b.volume == null) {
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        }
        if (a.volume == null) return 1
        if (b.volume == null) return -1
        return a.volume - b.volume
      })
    }

    return { name: displayName, books: groupBooksList }
  })
}
