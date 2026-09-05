/**
 * Guesses a series name and volume number from a raw title string, so the
 * correction form can prefill them instead of starting blank every time.
 * This is a best-effort heuristic, not a parser for a known format — API
 * titles are inconsistent, so the result is always editable, never final.
 *
 * Patterns handled, in order of preference:
 *   "Mistborn, Book 3"          -> series: "Mistborn", volume: 3
 *   "Mistborn Book 3"           -> series: "Mistborn", volume: 3
 *   "Mistborn Vol. 3"           -> series: "Mistborn", volume: 3
 *   "Mistborn #3"               -> series: "Mistborn", volume: 3
 *   "Mistborn (Mistborn, #3)"   -> series: "Mistborn", volume: 3
 *   "Mistborn 3: The Well..."   -> series: "Mistborn", volume: 3
 *
 * Anything that doesn't match one of these shapes returns nulls for both,
 * and the field is left for the user to fill in by hand.
 */
export function parseSeriesAndVolume(rawTitle) {
  if (!rawTitle) return { series: null, volume: null }

  const title = rawTitle.trim()

  // "Name (Series, #3)" or "Name (Series #3)" — trailing parenthetical,
  // common on Goodreads-sourced metadata that leaks into API results.
  const parenMatch = title.match(/\(([^,()]+),?\s*(?:book|vol\.?|volume|#)\s*(\d+(?:\.\d+)?)\)/i)
  if (parenMatch) {
    return { series: parenMatch[1].trim(), volume: Number(parenMatch[2]) }
  }

  // "Series, Book 3" / "Series Book 3" / "Series Vol. 3" / "Series Volume 3"
  const wordMatch = title.match(/^(.*?),?\s+(?:book|vol\.?|volume)\s+(\d+(?:\.\d+)?)\b/i)
  if (wordMatch) {
    return { series: wordMatch[1].trim(), volume: Number(wordMatch[2]) }
  }

  // "Series #3"
  const hashMatch = title.match(/^(.*?)\s+#(\d+(?:\.\d+)?)\b/)
  if (hashMatch) {
    return { series: hashMatch[1].trim(), volume: Number(hashMatch[2]) }
  }

  // "Series 3: Subtitle" or bare "Series 3" — trailing number, optionally
  // followed by a colon-introduced subtitle. Deliberately last/loosest,
  // since a bare trailing number is the easiest to false-positive on
  // (e.g. a one-off title that just happens to end in a year).
  const trailingNumberMatch = title.match(/^(.*\S)\s+(\d{1,3})(?::.*)?$/)
  if (trailingNumberMatch) {
    return { series: trailingNumberMatch[1].trim(), volume: Number(trailingNumberMatch[2]) }
  }

  return { series: null, volume: null }
}
