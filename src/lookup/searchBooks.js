import { fetchWithTimeout } from './fetchWithTimeout.js'
const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

/**
 * Free-text search for the wishlist flow — a friend recommends a book, or
 * you spot one in a shop with no barcode handy, and there's no ISBN to
 * scan at all. Returns a short list of candidates (title/author/cover,
 * plus an ISBN when Google Books happens to have one for that edition)
 * for the person to pick from, rather than committing to a single "best"
 * result the way the barcode lookup cascade does.
 *
 * Only searches Google Books — no Open Library fallback here. Open
 * Library's search endpoint is a different, less reliable shape than the
 * per-ISBN one used elsewhere in this app, and Google Books' free-text
 * search is generally strong enough on its own for this.
 */
export async function searchBooksByText(query) {
  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  url.searchParams.set('q', query)
  url.searchParams.set('maxResults', '8')
  if (API_KEY) url.searchParams.set('key', API_KEY)

  const res = await fetchWithTimeout(url.toString())
  if (!res.ok) {
    throw new Error(`Google Books search failed (${res.status})`)
  }

  const data = await res.json()
  const items = data.items ?? []

  return items
    .map((item) => normalizeSearchResult(item))
    .filter((result) => result.title.trim().length > 0)
}

function normalizeSearchResult(item) {
  const info = item.volumeInfo ?? {}

  const cover =
    info.imageLinks?.thumbnail?.replace('http://', 'https://') ??
    info.imageLinks?.smallThumbnail?.replace('http://', 'https://') ??
    null

  // Prefer ISBN-13 when Google Books has one for this edition. Not every
  // result will — some editions (older books, some translations) have no
  // industry identifier at all, in which case the caller assigns a
  // synthetic key instead (see WishlistPage's handlePickResult).
  const identifiers = info.industryIdentifiers ?? []
  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13')?.identifier ?? null

  return {
    isbn: isbn13,
    title: info.title ?? '',
    author: (info.authors ?? []).join(', '),
    coverUrl: cover,
    source: 'google_books'
  }
}
