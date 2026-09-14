import { lookupGoogleBooks } from './googleBooks.js'
import { lookupOpenLibrary } from './openLibrary.js'
import { lookupSeriesName } from './openLibrarySeries.js'
import { parseSeriesAndVolume } from './parseSeriesAndVolume.js'

/**
 * A "usable" hit needs at least a title — a record with no title isn't
 * worth showing over a blank manual-entry form.
 */
function isUsable(result) {
  return Boolean(result?.title?.trim())
}

/**
 * Cascades Google Books -> Open Library -> manual entry for title,
 * author, and cover. Always returns a normalized shape, even on a total
 * miss, so callers never have to special-case "no result" — they just
 * get source: "manual" with blank fields to hand to the correction form.
 */
export async function resolveIsbn(isbn) {
  const google = await lookupGoogleBooks(isbn)
  const hit = isUsable(google) ? google : await lookupOpenLibrary(isbn)

  if (!isUsable(hit)) {
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

  const { series, volume } = await resolveSeriesAndVolume(isbn, hit.title)
  return { ...hit, series, volume }
}

/**
 * Series name comes from Open Library's per-edition record when it has
 * one (a real cataloged name) — checked first, regardless of whether
 * Google Books or Open Library supplied the title/author/cover above.
 * Only falls back to guessing from the title when that lookup comes back
 * empty. Volume number: if the catalog series string itself contains a
 * number ("Mistborn -- 3"), use that; otherwise fall back to whatever
 * parses out of the title.
 */
async function resolveSeriesAndVolume(isbn, title) {
  const seriesFromCatalog = await lookupSeriesName(isbn).catch(() => null)

  if (!seriesFromCatalog) {
    return parseSeriesAndVolume(title)
  }

  const parsedFromCatalogSeries = parseSeriesAndVolume(seriesFromCatalog)
  if (parsedFromCatalogSeries.volume !== null) {
    return {
      series: parsedFromCatalogSeries.series ?? seriesFromCatalog,
      volume: parsedFromCatalogSeries.volume
    }
  }

  const parsedFromTitle = parseSeriesAndVolume(title)
  return { series: seriesFromCatalog, volume: parsedFromTitle.volume }
}
