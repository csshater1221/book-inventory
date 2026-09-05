/**
 * Looks up a book by ISBN via the Open Library Books API.
 * Returns a normalized result, or null if there's no usable hit.
 *
 * Like Google Books, Open Library doesn't reliably expose series/volume
 * as structured fields, so those are left null for the user to fill in.
 */
export async function lookupOpenLibrary(isbn) {
  const url = new URL('https://openlibrary.org/api/books')
  url.searchParams.set('bibkeys', `ISBN:${isbn}`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('jscmd', 'data')

  let res
  try {
    res = await fetch(url.toString())
  } catch (err) {
    console.warn('Open Library request failed', err)
    return null
  }

  if (!res.ok) return null

  const data = await res.json()
  const record = data[`ISBN:${isbn}`]
  if (!record) return null

  const cover =
    record.cover?.medium ?? record.cover?.large ?? record.cover?.small ?? null

  return {
    isbn,
    title: record.title ?? '',
    author: (record.authors ?? []).map((a) => a.name).join(', '),
    series: null,
    volume: null,
    coverUrl: cover,
    source: 'open_library'
  }
}
