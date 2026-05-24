import { formatDate } from '../lib/format'
import { statusLabels } from '../lib/job-status'
import type { Job } from '../types'

type HistoryPanelProps = {
  history: Job[]
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>최근 변환</h2>
        </div>
        <span className="badge">Metadata</span>
      </div>
      {history.length === 0 ? (
        <p className="empty">최근 변환 기록이 없습니다.</p>
      ) : (
        <div className="history-list">
          {history.map((job) => (
            <div className="history-item" key={job.id}>
              <span>{job.source_filename}</span>
              <small>
                {job.input_format} → {job.target_format} · {statusLabels[job.status]} ·{' '}
                {formatDate(job.created_at)}
              </small>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
