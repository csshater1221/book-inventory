/**
 * Autocomplete for series names, backed by a native <datalist>.
 * Options come from series names already present in the user's own
 * library (derived in memory — see CorrectionForm) rather than a
 * separate Firestore collection, since a personal collection is small
 * enough that this needs no extra reads or writes to keep in sync.
 */
export default function SeriesAutocomplete({ id, value, onChange, options }) {
  const listId = `${id}-options`

  return (
    <>
      <input
        id={id}
        list={listId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Mistborn (leave blank if standalone)"
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  )
}
