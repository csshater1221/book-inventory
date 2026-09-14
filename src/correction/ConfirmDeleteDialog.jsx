import { useEffect, useState } from 'react'

const WAIT_SECONDS = 3

/**
 * Confirmation dialog for permanently removing a book. The confirm button
 * stays disabled for WAIT_SECONDS after the dialog opens — a deliberate
 * friction so a mis-tap can't delete a book, since there's no undo.
 */
export default function ConfirmDeleteDialog({ title, onConfirm, onCancel }) {
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } catch (err) {
      console.error('Delete failed', err)
      setDeleting(false)
    }
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true">
      <div className="dialog-box">
        <h2>Remove this book?</h2>
        <p>
          <strong>{title}</strong> will be permanently removed from your library. This can't be
          undone.
        </p>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="danger"
            onClick={handleConfirm}
            disabled={secondsLeft > 0 || deleting}
          >
            {deleting ? 'Removing…' : secondsLeft > 0 ? `Wait ${secondsLeft}s…` : 'Remove permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}
