import { useState } from 'react'
import SeriesAutocomplete from './SeriesAutocomplete.jsx'
import { uploadCoverPhoto } from '../storage/coverUpload.js'

/**
 * Shown after every successful lookup (not just misses) — Google Books
 * and Open Library frequently return a title/author but no series or
 * volume, so this screen is the normal path for completing that data,
 * not just an error-recovery fallback.
 */
export default function CorrectionForm({ uid, draft, existingSeriesNames, onSave, onCancel }) {
  const [title, setTitle] = useState(draft.title)
  const [author, setAuthor] = useState(draft.author)
  const [series, setSeries] = useState(draft.series ?? '')
  const [volume, setVolume] = useState(draft.volume ?? '')
  const [coverUrl, setCoverUrl] = useState(draft.coverUrl)
  const [coverSource, setCoverSource] = useState(draft.coverUrl ? 'api' : 'none')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setError(null)
    try {
      const url = await uploadCoverPhoto(uid, draft.isbn, file)
      setCoverUrl(url)
      setCoverSource('upload')
    } catch (err) {
      console.error('Cover upload failed', err)
      setError('Could not upload that photo. You can still save without a cover.')
    } finally {
      setUploadingCover(false)
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
          {uploadingCover ? 'Uploading…' : coverUrl ? 'Replace cover photo' : 'Take a photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            disabled={uploadingCover}
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
        <button type="submit" className="primary" disabled={saving || uploadingCover}>
          {saving ? 'Saving…' : 'Save to library'}
        </button>
      </div>
    </form>
  )
}
