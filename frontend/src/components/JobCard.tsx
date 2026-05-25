import { downloadFilename, formatBytes, formatDate } from "../lib/format";
import { statusLabels } from "../lib/job-status";
import type { Job } from "../types";

type JobCardProps = {
  job: Job;
  onViewSettings: (job: Job) => void;
};

export function JobCard({ job, onViewSettings }: JobCardProps) {
  return (
    <article className={`job-card ${job.status}`}>
      <div className="job-topline">
        <div className="job-meta">
          <strong>{job.source_filename}</strong>
          <span>
            {job.input_format} → {job.target_format} ·{" "}
            {formatBytes(job.input_size_bytes)}
          </span>
        </div>
        <span className="status">{statusLabels[job.status]}</span>
      </div>
      <div className="progress-track">
        <span
          style={{
            width:
              job.status === "succeeded"
                ? "100%"
                : job.status === "failed"
                  ? "100%"
                  : "48%",
          }}
        />
      </div>
      {job.error_summary && <p className="error">{job.error_summary}</p>}
      <div className="job-actions">
        <small>만료: {formatDate(job.expires_at)}</small>
        <div className="job-action-buttons">
          <button
            className="secondary settings-button"
            type="button"
            onClick={() => onViewSettings(job)}
          >
            설정 보기
          </button>
          {job.download_available && (
            <a
              className="download"
              href={`/api/jobs/${job.id}/download`}
              download={downloadFilename(job)}
            >
              다운로드
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
