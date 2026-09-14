/**
 * Best-effort fetch of a human-readable series name for this ISBN, using
 * Open Library's per-edition record — a different endpoint than the one
 * lookupOpenLibrary.js uses for title/author/cover. This is the only one
 * of our two sources that sometimes carries a real cataloged series name
 * on the edition itself. Google Books has no equivalent: its API only
 * ever exposes an opaque internal series ID, never a human-readable name,
 * so there's nothing usable to pull from there.
 *
 * Returns the first series string Open Library has for this edition, or
 * null if there's no edition record, no series field, or the request
 * fails — any of which just means resolveIsbn.js falls back to parsing
 * the title instead.
 */
export async function lookupSeriesName(isbn) {
  let res
  try {
    res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
  } catch (err) {
    console.warn('Open Library edition request failed', err)
    return null
  }

  if (!res.ok) return null

  let data
  try {
    data = await res.json()
  } catch (err) {
    return null
  }

  const series = data.series
  if (!Array.isArray(series) || series.length === 0) return null

  const name = series[0]
  return typeof name === 'string' && name.trim() ? name.trim() : null
}
