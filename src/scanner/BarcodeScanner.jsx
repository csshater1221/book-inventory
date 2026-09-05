import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const ELEMENT_ID = 'barcode-scanner-viewport'

/**
 * Camera-based barcode scanner, locked to EAN-13.
 *
 * Books carry an EAN-13 (the ISBN) plus sometimes a small EAN-5 add-on
 * printed right next to it (a price supplement). Restricting
 * formatsToSupport to EAN_13 means html5-qrcode never even attempts to
 * decode that add-on, so we don't need to filter it out after the fact.
 *
 * Emits at most one onScan per physical barcode: once a scan succeeds we
 * pause the camera loop entirely and wait for the parent to call
 * `ref.current.resume()` once it's done handling that ISBN (dedup check,
 * lookup, correction screen dismissed). Without this pause, html5-qrcode's
 * continuous scan loop fires the same barcode many times a second while it
 * stays in frame.
 */
const BarcodeScanner = forwardRef(function BarcodeScanner({ onScan, active }, ref) {
  const scannerRef = useRef(null)
  const isRunningRef = useRef(false)
  const [error, setError] = useState(null)

  useImperativeHandle(ref, () => ({
    resume() {
      const scanner = scannerRef.current
      if (scanner && !isRunningRef.current) {
        isRunningRef.current = true
        scanner.resume()
      }
    }
  }))

  useEffect(() => {
    if (!active) return

    const scanner = new Html5Qrcode(ELEMENT_ID, {
      formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      verbose: false
    })
    scannerRef.current = scanner
    let cancelled = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          // Guard against duplicate fires within the same "in frame" window.
          if (!isRunningRef.current) return
          isRunningRef.current = false
          scanner.pause(true)
          onScan(decodedText)
        },
        () => {
          // Per-frame "nothing decoded" callback — expected constantly,
          // intentionally ignored.
        }
      )
      .then(() => {
        if (!cancelled) isRunningRef.current = true
      })
      .catch((err) => {
        console.error('Camera start failed', err)
        setError(
          'Could not access the camera. Check that camera permission is granted for this site.'
        )
      })

    return () => {
      cancelled = true
      isRunningRef.current = false
      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      } else {
        scanner.clear().catch(() => {})
      }
    }
  }, [active])

  if (error) {
    return <p className="scanner-error">{error}</p>
  }

  return <div id={ELEMENT_ID} className="scanner-viewport" />
})

export default BarcodeScanner
