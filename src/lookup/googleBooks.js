const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

/**
 * Looks up a book by ISBN via the Google Books API.
 * Returns a normalized result, or null if there's no usable hit.
 *
 * Note: Google Books has no dedicated "series"/"volume" field in practice —
 * that data lives (inconsistently) in subtitles or not at all. We don't try
 * to guess it here; the correction screen is where the user fills that in.
 */
export async function lookupGoogleBooks(isbn) {
  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  url.searchParams.set('q', `isbn:${isbn}`)
  if (API_KEY) url.searchParams.set('key', API_KEY)

  let res
  try {
    res = await fetch(url.toString())
  } catch (err) {
    // Network failure — treat as a miss so the cascade continues.
    console.warn('Google Books request failed', err)
    return null
  }

  if (!res.ok) return null

  const data = await res.json()
  const item = data.items?.[0]
  if (!item?.volumeInfo) return null

  const info = item.volumeInfo
  const cover =
    info.imageLinks?.thumbnail?.replace('http://', 'https://') ??
    info.imageLinks?.smallThumbnail?.replace('http://', 'https://') ??
    null

  return {
    isbn,
    title: info.title ?? '',
    author: (info.authors ?? []).join(', '),
    series: null,
    volume: null,
    coverUrl: cover,
    source: 'google_books'
  }
}
