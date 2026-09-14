import { useEffect, useState } from 'react'
import SeriesAutocomplete from './SeriesAutocomplete.jsx'
import ConfirmDeleteDialog from './ConfirmDeleteDialog.jsx'
import { saveCoverLocally } from '../storage/coverStorage.js'
import { uploadCoverImage } from '../storage/coverSync.js'
import { resizeCoverImage } from '../storage/resizeCoverImage.js'
import { useCover } from '../storage/useCover.js'

/**
 * Shown after every successful lookup (not just misses) — Google Books
 * and Open Library frequently return a title/author but no series or
 * volume, so this screen is the normal path for completing that data,
 * not just an error-recovery fallback.
 *
 * Also reused for editing a book already in the library (see
 * LibraryPage): pass onDelete to enable the "Remove from library" flow,
 * and submitLabel to relabel the primary button ("Save changes" vs the
 * default "Save to library").
 */
export default function CorrectionForm({
  uid,
  draft,
  existingSeriesNames,
  onSave,
  onCancel,
  onDelete,
  submitLabel = 'Save to library'
}) {
  const [title, setTitle] = useState(draft.title)
  const [author, setAuthor] = useState(draft.author)
  const [series, setSeries] = useState(draft.series ?? '')
  const [volume, setVolume] = useState(draft.volume ?? '')
  const [coverUrl, setCoverUrl] = useState(draft.coverUrl)
  const [coverSource, setCoverSource] = useState(draft.coverUrl ? 'api' : draft.coverSource ?? 'none')
  const [savingCover, setSavingCover] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Editing a book whose cover is a device photo: pull it in cache-first
  // (this device's IndexedDB, then the synced Firestore copy — see
  // useCover.js) to show what's already there. No-ops for the new-scan
  // flow, where coverSource isn't "photo" yet.
  const existingPhotoCoverUrl = useCover(uid, draft.isbn, draft.coverSource === 'photo' && !draft.coverUrl)
  useEffect(() => {
    if (existingPhotoCoverUrl && !coverUrl) {
      setCoverUrl(existingPhotoCoverUrl)
    }
  }, [existingPhotoCoverUrl])

  // Resized/compressed client-side first (see resizeCoverImage.js), then
  // written to IndexedDB immediately for a fast local preview, and
  // synced to Firestore so it's there when this book is opened on
  // another device. Both happen before the final "Save to library"
  // submit — simplest flow, at the minor cost of an orphaned cover (in
  // IndexedDB and Firestore) if the user takes a photo then cancels the
  // form entirely. Harmless for a personal-scale library.
  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSavingCover(true)
    setError(null)
    try {
      const { blob, dataUrl } = await resizeCoverImage(file)
      await saveCoverLocally(draft.isbn, blob)
      setCoverUrl(URL.createObjectURL(blob))
      setCoverSource('photo')
      await uploadCoverImage(uid, draft.isbn, dataUrl)
    } catch (err) {
      console.error('Cover save/sync failed', err)
      setError('Could not save that photo. You can still save without a cover, or try again.')
    } finally {
      setSavingCover(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        isbn: draft.isbn,
        title,
        author,
        series,
        volume,
        coverUrl,
        coverSource,
        source: draft.source
      })
    } catch (err) {
      console.error('Save failed', err)
      setError('Could not save this book. Check your connection and try again.')
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    await onDelete()
    // No need to reset confirmingDelete on success — the parent unmounts
    // this form once the delete completes. It only matters on failure,
    // where ConfirmDeleteDialog itself re-enables its button.
  }

  return (
    <form className="correction-form" onSubmit={handleSubmit}>
      <div className="correction-cover">
        {coverUrl ? (
          <img src={coverUrl} alt="" />
        ) : (
          <div className="book-cover-placeholder large" aria-hidden="true">
            {title.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <label className="photo-button">
          {savingCover ? 'Saving…' : coverUrl ? 'Replace cover photo' : 'Take a photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            disabled={savingCover}
            hidden
          />
        </label>
      </div>

      <label htmlFor="isbn-field">ISBN</label>
      <input id="isbn-field" type="text" value={draft.isbn} disabled />

      <label htmlFor="title-field">Title</label>
      <input
        id="title-field"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <label htmlFor="author-field">Author</label>
      <input id="author-field" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />

      <label htmlFor="series-field">Series</label>
      <SeriesAutocomplete
        id="series-field"
        value={series}
        onChange={setSeries}
        options={existingSeriesNames}
      />

      <label htmlFor="volume-field">Volume / book number</label>
      <input
        id="volume-field"
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={volume}
        onChange={(e) => setVolume(e.target.value)}
        placeholder="e.g. 3"
      />

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={saving || savingCover}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>

      {onDelete && (
        <button
          type="button"
          className="link-button danger-link"
          onClick={() => setConfirmingDelete(true)}
        >
          Remove this book from your library
        </button>
      )}

      {confirmingDelete && (
        <ConfirmDeleteDialog
          title={title}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </form>
  )
}
