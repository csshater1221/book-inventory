import { useState } from 'react'

/**
 * Small collapsible panel showing recent scan activity: the raw ISBN
 * decoded off the barcode, and what the lookup cascade returned for it
 * (or the dedup/error outcome). Purely a dev aid — nothing here is
 * persisted, it just holds the last N entries in memory for this
 * session (see ScanPage's debugLog state).
 */
export default function DebugPanel({ entries }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="debug-panel">
      <button
        type="button"
        className="debug-panel-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Debug {open ? '▾' : '▸'} {entries.length > 0 && `(${entries.length})`}
      </button>

      {open && (
        <div className="debug-panel-body">
          {entries.length === 0 ? (
            <p className="debug-empty">Nothing scanned yet this session.</p>
          ) : (
            <ul className="debug-list">
              {entries.map((entry) => (
                <li key={entry.id} className="debug-entry">
                  <div className="debug-entry-head">
                    <span className="debug-isbn">{entry.isbn}</span>
                    <span className={`debug-outcome debug-outcome-${entry.outcome}`}>
                      {entry.outcome}
                    </span>
                    <span className="debug-time">{entry.time}</span>
                  </div>
                  <pre className="debug-detail">{entry.detail}</pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
