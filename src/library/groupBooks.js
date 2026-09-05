const STANDALONE_LABEL = 'Standalone'

/**
 * Groups books by series name (books with no series land in a shared
 * "Standalone" bucket), then sorts:
 *  - groups alphabetically by name, with Standalone always sorted in its
 *    normal alphabetical position rather than pinned to an end
 *  - books within a series by volume ascending (nulls last)
 *  - books within Standalone alphabetically by title
 *
 * Returns an array of { name, books } ready to render as sections.
 */
export function groupBooks(books) {
  const groups = new Map()

  for (const book of books) {
    const key = book.series?.trim() || STANDALONE_LABEL
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(book)
  }

  const sortedGroupNames = [...groups.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  return sortedGroupNames.map((name) => {
    const groupBooksList = groups.get(name)

    if (name === STANDALONE_LABEL) {
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

    return { name, books: groupBooksList }
  })
}
