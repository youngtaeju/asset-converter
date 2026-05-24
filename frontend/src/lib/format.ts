import type { Job } from '../types'

export function formatBytes(bytes?: number | null) {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function downloadFilename(job: Job) {
  const normalized = job.source_filename.replace(/\\/g, '/')
  const baseName =
    normalized.split('/').pop()?.replace(/[\x00-\x1f\x7f/\\]+/g, '_').trim() || 'upload'
  const stem = baseName.replace(/\.[^.]*$/, '').trim() || 'upload'
  return `${stem}.${job.target_format}`
}
