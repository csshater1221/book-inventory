// Word -> value for spelled-out volume numbers ("Five", "Twenty-Five").
// Covers 0-99, which comfortably outlasts any light novel/manga series
// scanned in the real world; higher and the user just types the digit in.
const WORD_VALUES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
}

const ONES_WORDS = 'one|two|three|four|five|six|seven|eight|nine'
const TEEN_WORDS =
  'ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen'
const TENS_WORDS = 'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety'

// Matches a digit run ("10", "3.5") OR a spelled-out number: a tens word
// optionally followed by a ones word ("twenty", "twenty five",
// "twenty-five"), a teen word, a ones word, or "zero" — in that order so
// the regex engine prefers the longest valid phrase first.
const NUMBER_TOKEN =
  `(?:\\d+(?:\\.\\d+)?|(?:${TENS_WORDS})(?:[\\s-](?:${ONES_WORDS}))?|${TEEN_WORDS}|${ONES_WORDS}|zero)`

/**
 * Converts a matched number token — digits or spelled-out words — to a
 * number. Returns null only if the token doesn't parse, which shouldn't
 * happen given it was matched by NUMBER_TOKEN in the first place.
 */
function toVolumeNumber(token) {
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token)

  const clean = token.toLowerCase().trim()
  if (WORD_VALUES[clean] !== undefined) return WORD_VALUES[clean]

  const [first, second] = clean.split(/[\s-]+/)
  const tens = WORD_VALUES[first]
  const ones = WORD_VALUES[second]
  if (tens !== undefined && tens >= 20 && tens % 10 === 0 && ones !== undefined && ones < 10) {
    return tens + ones
  }

  return null
}

// Strips a trailing separator ("--", "-", ",", ":") left behind after the
// volume number is cut off the end of a string — e.g. "Mistborn --" left
// over from "Mistborn -- 3". Matters more now that this function also
// runs on catalog series strings (see resolveIsbn.js), which use these
// separators more often than plain titles do.
function cleanSeriesName(str) {
  return str.trim().replace(/[\s,:;\-–—]+$/, '').trim()
}

/**
 * Guesses a series name and volume number from a raw title string, so the
 * correction form can prefill them instead of starting blank every time.
 * This is a best-effort heuristic, not a parser for a known format — API
 * titles are inconsistent, so the result is always editable, never final.
 * Volume numbers may be digits or spelled out ("Five", "Twenty-Five") —
 * both are recognized everywhere a number is expected below.
 *
 * Patterns handled, in order of preference:
 *   "Mistborn, Book 3" / "Mistborn, Book Three"        -> series: "Mistborn", volume: 3
 *   "Mistborn Book 3"                                   -> series: "Mistborn", volume: 3
 *   "Mistborn Vol. 3"                                   -> series: "Mistborn", volume: 3
 *   "Mistborn #3"                                        -> series: "Mistborn", volume: 3
 *   "Mistborn (Mistborn, #3)"                           -> series: "Mistborn", volume: 3
 *   "Mistborn 3: The Well of Ascension"                  -> series: "Mistborn", volume: 3
 *   "The Apothecary Diaries 10 (Light Novel)"           -> series: "The Apothecary Diaries (Light Novel)", volume: 10
 *   "The Apothecary Diaries Ten (Light Novel)"          -> series: "The Apothecary Diaries (Light Novel)", volume: 10
 *   "Mistborn 3" / "Mistborn Three"                      -> series: "Mistborn", volume: 3
 *
 * Anything that doesn't match one of these shapes returns nulls for both,
 * and the field is left for the user to fill in by hand.
 */
export function parseSeriesAndVolume(rawTitle) {
  if (!rawTitle) return { series: null, volume: null }

  const title = rawTitle.trim()

  // "Name (Series, #3)" or "Name (Series #3)" — trailing parenthetical
  // with the volume number INSIDE it, common on Goodreads-sourced
  // metadata that leaks into API results.
  const parenMatch = title.match(
    new RegExp(`\\(([^,()]+),?\\s*(?:book|vol\\.?|volume|#)\\s*(${NUMBER_TOKEN})\\)`, 'i')
  )
  if (parenMatch) {
    return { series: cleanSeriesName(parenMatch[1]), volume: toVolumeNumber(parenMatch[2]) }
  }

  // "Series, Book 3" / "Series Book 3" / "Series Vol. 3" / "Series Volume 3"
  const wordMatch = title.match(
    new RegExp(`^(.*?),?\\s+(?:book|vol\\.?|volume)\\s+(${NUMBER_TOKEN})\\b`, 'i')
  )
  if (wordMatch) {
    return { series: cleanSeriesName(wordMatch[1]), volume: toVolumeNumber(wordMatch[2]) }
  }

  // "Series #3"
  const hashMatch = title.match(new RegExp(`^(.*?)\\s+#(${NUMBER_TOKEN})\\b`, 'i'))
  if (hashMatch) {
    return { series: cleanSeriesName(hashMatch[1]), volume: toVolumeNumber(hashMatch[2]) }
  }

  // Trailing bare number, optionally followed by EITHER a format tag in
  // parens ("Title 10 (Light Novel)") OR a colon-introduced subtitle
  // ("Title 3: The Well of Ascension") — never both. When a trailing
  // parenthetical is present, it's folded back into the series name
  // (e.g. "(Light Novel)" is a format marker, not a subtitle, so it
  // belongs with the series, not discarded). Deliberately the last/
  // loosest pattern tried, since a bare trailing number is the easiest
  // to false-positive on (e.g. a one-off title that just happens to end
  // in a year, or a spelled-out number that's incidentally part of a
  // normal title rather than a volume marker).
  const trailingNumberMatch = title.match(
    new RegExp(`^(.*\\S)\\s+(${NUMBER_TOKEN})\\s*(\\([^()]+\\))?(?::\\s*.*)?$`, 'i')
  )
  if (trailingNumberMatch) {
    const [, namePart, volumePart, tagPart] = trailingNumberMatch
    const volume = toVolumeNumber(volumePart)
    if (volume !== null) {
      const series = tagPart ? `${cleanSeriesName(namePart)} ${tagPart}` : cleanSeriesName(namePart)
      return { series, volume }
    }
  }

  return { series: null, volume: null }
}
