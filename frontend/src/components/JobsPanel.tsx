import type { Job } from "../types";
import { JobCard } from "./JobCard";

type JobsPanelProps = {
  jobs: Job[];
  onViewSettings: (job: Job) => void;
};

export function JobsPanel({ jobs, onViewSettings }: JobsPanelProps) {
  return (
    <div className="jobs-panel" role="tabpanel">
      {jobs.length === 0 ? (
        <p className="empty">아직 생성된 job이 없습니다.</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <JobCard job={job} onViewSettings={onViewSettings} key={job.id} />
          ))}
        </div>
      )}
    </div>
  );
}
