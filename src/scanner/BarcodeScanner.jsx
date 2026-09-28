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
 *
 * Also tracks document visibility: minimizing the app (or switching tabs)
 * suspends or outright kills the camera's MediaStream on most mobile
 * browsers, independent of anything html5-qrcode's own pause/resume knows
 * about. Calling `.resume()` on a stream the OS already tore down doesn't
 * bring the camera back — it just leaves the view frozen. So instead of
 * trying to keep a stale stream alive, we fully release the camera the
 * moment the page goes hidden, and re-acquire it fresh when it's visible
 * again — restoring whatever state (actively scanning vs. paused for
 * processing) the scan flow was actually in, rather than assuming either.
 */
const BarcodeScanner = forwardRef(function BarcodeScanner({ onScan, active }, ref) {
  const scannerRef = useRef(null)
  // Whether we currently want frames to be decoded — false while a scan
  // is being processed (dedup/lookup/cooldown) and while backgrounded.
  const isRunningRef = useRef(false)
  // Whether the parent WANTS active scanning once the camera is next
  // available — the intent to restore after backgrounding, separate from
  // whether the camera happens to exist right now.
  const wantsToScanRef = useRef(true)
  // The camera effect below only re-runs when active/visible change, so a
  // plain `onScan` captured inside it would go stale — it'd keep calling
  // the first render's handler, along with whatever library data that
  // render saw. Always call through this ref to get the latest one.
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState(null)
  const [visible, setVisible] = useState(!document.hidden)

  useEffect(() => {
    function handleVisibilityChange() {
      setVisible(!document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useImperativeHandle(ref, () => ({
    resume() {
      wantsToScanRef.current = true
      const scanner = scannerRef.current
      if (scanner && !isRunningRef.current) {
        isRunningRef.current = true
        scanner.resume()
      }
      // If there's no scanner right now (page is hidden), there's nothing
      // to resume — the effect below picks up wantsToScanRef once the
      // page is visible again and starts already-running instead of
      // paused.
    }
  }))

  useEffect(() => {
    if (!active || !visible) {
      // Backgrounded (or inactive): release the camera entirely rather
      // than leaving a suspended stream around for the OS to potentially
      // never hand back cleanly.
      const scanner = scannerRef.current
      isRunningRef.current = false
      scannerRef.current = null
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().then(() => scanner.clear()).catch(() => {})
        } else {
          scanner.clear().catch(() => {})
        }
      }
      return
    }

    let cancelled = false
    const scanner = new Html5Qrcode(ELEMENT_ID, {
      formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      verbose: false
    })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          // Guard against duplicate fires within the same "in frame" window.
          if (!isRunningRef.current) return
          isRunningRef.current = false
          wantsToScanRef.current = false
          scanner.pause(true)
          onScanRef.current(decodedText)
        },
        () => {
          // Per-frame "nothing decoded" callback — expected constantly,
          // intentionally ignored.
        }
      )
      .then(() => {
        if (cancelled) return
        // Restore whatever the scan flow actually wanted: freshly
        // returned from background mid-cooldown/processing should come
        // back paused, not actively scanning again.
        if (wantsToScanRef.current) {
          isRunningRef.current = true
        } else {
          isRunningRef.current = false
          scanner.pause(true)
        }
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
      if (scannerRef.current === scanner) scannerRef.current = null
      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      } else {
        scanner.clear().catch(() => {})
      }
    }
  }, [active, visible])

  if (error) {
    return <p className="scanner-error">{error}</p>
  }

  return <div id={ELEMENT_ID} className="scanner-viewport" />
})

export default BarcodeScanner
