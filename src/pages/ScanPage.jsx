import { useMemo, useRef, useState } from 'react'
import BarcodeScanner from '../scanner/BarcodeScanner.jsx'
import DebugPanel from '../scanner/DebugPanel.jsx'
import CorrectionForm from '../correction/CorrectionForm.jsx'
import { resolveIsbn } from '../lookup/resolveIsbn.js'
import { findExistingBook, bumpScanCount, saveBook } from '../library/useLibrary.js'
import { useAuth } from '../auth/AuthContext.jsx'

// How the scan flow is currently occupied:
//  scanning   - camera is live, waiting for a barcode
//  checking   - just scanned, checking Firestore for a dup
//  looking-up - not a dup, querying Google Books / Open Library
//  cooldown   - a fetch just finished (dup or lookup); camera stays
//               paused briefly so the same barcode isn't immediately
//               re-read while it's still in frame
//  correcting - correction form is open for the resolved/blank draft
//  error      - something in the checking/lookup path failed
const STATUS = {
  SCANNING: 'scanning',
  CHECKING: 'checking',
  LOOKING_UP: 'looking-up',
  COOLDOWN: 'cooldown',
  CORRECTING: 'correcting',
  ERROR: 'error'
}

// How long the camera stays paused after a fetch (dedup check or lookup)
// completes, before it's willing to read another barcode. Long enough that
// pulling the same book away from the camera doesn't immediately re-trigger
// a second scan of it.
const POST_FETCH_COOLDOWN_MS = 3000

const MAX_DEBUG_ENTRIES = 20

function timestamp() {
  return new Date().toLocaleTimeString([], { hour12: false })
}

export default function ScanPage({ books }) {
  const { user } = useAuth()
  const scannerRef = useRef(null)
  const [status, setStatus] = useState(STATUS.SCANNING)
  const [draft, setDraft] = useState(null)
  const [toast, setToast] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [debugLog, setDebugLog] = useState([])

  const existingSeriesNames = useMemo(() => {
    const names = new Set()
    for (const book of books) {
      if (book.series) names.add(book.series)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [books])

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 2200)
  }

  function logDebug(isbn, outcome, detail) {
    setDebugLog((prev) =>
      [
        { id: `${Date.now()}-${isbn}`, isbn, outcome, time: timestamp(), detail },
        ...prev
      ].slice(0, MAX_DEBUG_ENTRIES)
    )
  }

  // Pauses on the current status for POST_FETCH_COOLDOWN_MS, then resumes
  // the camera and drops back to "scanning". Used after both the dedup
  // path and the lookup path, so the camera never re-reads a barcode
  // that's still sitting in frame right after we just processed it.
  function cooldownThenResume() {
    setStatus(STATUS.COOLDOWN)
    setTimeout(() => {
      setStatus(STATUS.SCANNING)
      scannerRef.current?.resume()
    }, POST_FETCH_COOLDOWN_MS)
  }

  async function handleScan(isbn) {
    setErrorMessage(null)
    setStatus(STATUS.CHECKING)

    let existing
    try {
      existing = await findExistingBook(user.uid, isbn)
    } catch (err) {
      console.error('Dedup check failed', err)
      logDebug(isbn, 'error', String(err))
      setErrorMessage("Couldn't check your library — check your connection.")
      setStatus(STATUS.ERROR)
      cooldownThenResume()
      return
    }

    if (existing) {
      logDebug(isbn, 'duplicate', `Already have: ${existing.title}`)
      await bumpScanCount(user.uid, isbn).catch(() => {})
      showToast(`Already in your library: ${existing.title}`)
      cooldownThenResume()
      return
    }

    setStatus(STATUS.LOOKING_UP)
    let result
    try {
      result = await resolveIsbn(isbn)
    } catch (err) {
      console.error('Lookup failed', err)
      logDebug(isbn, 'error', String(err))
      setErrorMessage("Lookup failed — you can still enter this book manually.")
      setStatus(STATUS.ERROR)
      cooldownThenResume()
      return
    }

    logDebug(isbn, result.source === 'manual' ? 'miss' : 'hit', JSON.stringify(result, null, 2))
    setDraft(result)
    setStatus(STATUS.CORRECTING)
  }

  async function handleSave(bookData) {
    await saveBook(user.uid, bookData)
    showToast(`Saved: ${bookData.title}`)
    setDraft(null)
    cooldownThenResume()
  }

  function handleCancel() {
    setDraft(null)
    cooldownThenResume()
  }

  return (
    <div className="scan-page">
      {toast && <div className="toast">{toast}</div>}

      {status === STATUS.CORRECTING && draft ? (
        <CorrectionForm
          draft={draft}
          existingSeriesNames={existingSeriesNames}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <>
          <BarcodeScanner ref={scannerRef} active onScan={handleScan} />
          <p className={`scan-status scan-status-${status}`}>
            {status === STATUS.SCANNING && 'Scanning — point the camera at the barcode.'}
            {status === STATUS.CHECKING && 'Checking your library…'}
            {status === STATUS.LOOKING_UP && 'Looking up this ISBN…'}
            {status === STATUS.COOLDOWN && 'One moment before the next scan…'}
            {status === STATUS.ERROR && errorMessage}
          </p>
        </>
      )}

      <DebugPanel entries={debugLog} />
    </div>
  )
}
