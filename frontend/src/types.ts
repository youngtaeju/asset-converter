export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired'
export type TargetFormat = 'webp' | 'mp4' | 'jpg' | 'png'

export type WarningNote = {
  code: string
  message: string
}

export type Job = {
  id: string
  status: JobStatus
  source_filename: string
  input_format: string
  target_format: TargetFormat
  input_size_bytes: number
  output_size_bytes?: number | null
  duration_ms?: number | null
  warnings: WarningNote[]
  error_summary?: string | null
  created_at: string
  expires_at?: string | null
  download_available: boolean
}

export type BatchResponse = {
  jobs: Job[]
  accepted_count: number
  rejected: Array<{
    source_filename: string
    error: { code: string; message: string }
  }>
}
