/**
 * Small formatting helpers used across the UI.
 */

/** Human-friendly relative time, e.g. "just now", "3m", "2h", "Mar 4". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Format a byte count as B / KB / MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Group conversations into "Today", "Yesterday", "Previous" buckets. */
export function timeBucket(iso: string): 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older' {
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = date.getTime()
  if (t >= startOfToday) return 'Today'
  if (t >= startOfToday - 86_400_000) return 'Yesterday'
  if (t >= startOfToday - 7 * 86_400_000) return 'Previous 7 days'
  return 'Older'
}

/** Read a File/Blob as a base64 string (no data: prefix) + media type. */
export function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve({ data: result.slice(comma + 1), mediaType: file.type || 'image/png' })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
