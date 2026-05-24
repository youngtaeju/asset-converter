import type { Job } from '../types'
import { JobCard } from './JobCard'

type JobsPanelProps = {
  jobs: Job[]
}

export function JobsPanel({ jobs }: JobsPanelProps) {
  return (
    <section className="panel jobs-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Jobs</p>
          <h2>진행 상태</h2>
        </div>
        <span className="badge">{jobs.length}개</span>
      </div>
      {jobs.length === 0 ? (
        <p className="empty">아직 생성된 job이 없습니다.</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <JobCard job={job} key={job.id} />
          ))}
        </div>
      )}
    </section>
  )
}
