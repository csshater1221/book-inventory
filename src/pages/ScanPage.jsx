import { useMemo, useRef, useState } from 'react'
import BarcodeScanner from '../scanner/BarcodeScanner.jsx'
import CorrectionForm from '../correction/CorrectionForm.jsx'
import { resolveIsbn } from '../lookup/resolveIsbn.js'
import { findExistingBook, bumpScanCount, saveBook } from '../library/useLibrary.js'
import { useAuth } from '../auth/AuthContext.jsx'

// How the scan flow is currently occupied:
//  scanning   - camera is live, waiting for a barcode
//  checking   - just scanned, checking Firestore for a dup
//  looking-up - not a dup, querying Google Books / Open Library
//  correcting - correction form is open for the resolved/blank draft
const STATUS = {
  SCANNING: 'scanning',
  CHECKING: 'checking',
  LOOKING_UP: 'looking-up',
  CORRECTING: 'correcting'
}

export default function ScanPage({ books }) {
  const { user } = useAuth()
  const scannerRef = useRef(null)
  const [status, setStatus] = useState(STATUS.SCANNING)
  const [draft, setDraft] = useState(null)
  const [toast, setToast] = useState(null)

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

  async function handleScan(isbn) {
    setStatus(STATUS.CHECKING)

    const existing = await findExistingBook(user.uid, isbn)
    if (existing) {
      await bumpScanCount(user.uid, isbn).catch(() => {})
      showToast(`Already in your library: ${existing.title}`)
      setStatus(STATUS.SCANNING)
      scannerRef.current?.resume()
      return
    }

    setStatus(STATUS.LOOKING_UP)
    const result = await resolveIsbn(isbn)
    setDraft(result)
    setStatus(STATUS.CORRECTING)
  }

  async function handleSave(bookData) {
    await saveBook(user.uid, bookData)
    showToast(`Saved: ${bookData.title}`)
    setDraft(null)
    setStatus(STATUS.SCANNING)
    scannerRef.current?.resume()
  }

  function handleCancel() {
    setDraft(null)
    setStatus(STATUS.SCANNING)
    scannerRef.current?.resume()
  }

  return (
    <div className="scan-page">
      {toast && <div className="toast">{toast}</div>}

      {status === STATUS.CORRECTING && draft ? (
        <CorrectionForm
          uid={user.uid}
          draft={draft}
          existingSeriesNames={existingSeriesNames}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <>
          <BarcodeScanner ref={scannerRef} active onScan={handleScan} />
          <p className="scan-hint">
            {status === STATUS.CHECKING && 'Checking your library…'}
            {status === STATUS.LOOKING_UP && 'Looking up this ISBN…'}
            {status === STATUS.SCANNING && 'Point the camera at the barcode.'}
          </p>
        </>
      )}
    </div>
  )
}
