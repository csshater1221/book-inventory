const MAX_DIMENSION = 480
const JPEG_QUALITY = 0.72

/**
 * Resizes and compresses a cover photo client-side before it's stored
 * anywhere. This matters more now that covers sync through Firestore
 * (see coverSync.js): a full-resolution phone photo can be several MB,
 * base64 inflates that by about a third, and Firestore caps a document
 * at 1 MiB — so an unresized photo could fail to save outright. Capping
 * the longer edge at 480px and compressing to JPEG keeps a typical cover
 * in the tens of KB, comfortably inside that limit, and keeps the sync
 * fast on mobile data too.
 *
 * Returns both a Blob (for the local IndexedDB cache) and a base64 data
 * URL (for the Firestore doc) from a single decode/resize pass, so
 * callers don't have to convert between the two themselves.
 */
export async function resizeCoverImage(file) {
  const imageBitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(imageBitmap.width, imageBitmap.height))
  const width = Math.round(imageBitmap.width * scale)
  const height = Math.round(imageBitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0, width, height)
  imageBitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)

  return { blob, dataUrl }
}
