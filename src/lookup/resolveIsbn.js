import { lookupGoogleBooks } from './googleBooks.js'
import { lookupOpenLibrary } from './openLibrary.js'
import { parseSeriesAndVolume } from './parseSeriesAndVolume.js'

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
 *
 * Neither API reliably returns structured series/volume, so we run the
 * title through parseSeriesAndVolume as a best-effort prefill — the
 * correction form always shows these as editable, so a wrong guess just
 * costs the user a quick fix rather than silently sticking.
 */
export async function resolveIsbn(isbn) {
  const google = await lookupGoogleBooks(isbn)
  if (isUsable(google)) return withParsedSeries(google)

  const openLibrary = await lookupOpenLibrary(isbn)
  if (isUsable(openLibrary)) return withParsedSeries(openLibrary)

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

function withParsedSeries(result) {
  const { series, volume } = parseSeriesAndVolume(result.title)
  return { ...result, series, volume }
}
