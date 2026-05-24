import type { Job } from "../types";
import { JobCard } from "./JobCard";

type JobsPanelProps = {
  jobs: Job[];
};

export function JobsPanel({ jobs }: JobsPanelProps) {
  return (
    <div className="jobs-panel" role="tabpanel">
      {jobs.length === 0 ? (
        <p className="empty">아직 생성된 job이 없습니다.</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <JobCard job={job} key={job.id} />
          ))}
        </div>
      )}
    </div>
  );
}
