import { lookupGoogleBooks } from './googleBooks.js'
import { lookupOpenLibrary } from './openLibrary.js'

/**
 * A "usable" hit needs at least a title — a record with no title isn't
 * worth showing over a blank manual-entry form.
 */
function isUsable(result) {
  return Boolean(result?.title?.trim())
}

/**
 * Cascades Google Books -> Open Library -> manual entry.
 * Always returns a normalized shape, even on a total miss, so callers
 * never have to special-case "no result" — they just get source: "manual"
 * with blank fields to hand to the correction form.
 */
export async function resolveIsbn(isbn) {
  const google = await lookupGoogleBooks(isbn)
  if (isUsable(google)) return google

  const openLibrary = await lookupOpenLibrary(isbn)
  if (isUsable(openLibrary)) return openLibrary

  return {
    isbn,
    title: '',
    author: '',
    series: null,
    volume: null,
    coverUrl: null,
    source: 'manual'
  }
}
