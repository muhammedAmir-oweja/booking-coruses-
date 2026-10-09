/**
 * Turns a fetched Blob into a save prompt. Shared by the student-document and
 * course-file downloads, both of which have to go through the API client so the
 * Authorization header is attached - see the note in api/students.ts.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers; a tick is
  // enough for the click to have been handled.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
