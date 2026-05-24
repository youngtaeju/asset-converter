import { downloadFilename, formatBytes, formatDate } from "../lib/format";
import { statusLabels } from "../lib/job-status";
import type { Job } from "../types";

export function JobCard({ job }: { job: Job }) {
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
      {job.warnings.length > 0 && (
        <div className="warnings">
          {job.warnings.map((warning) => (
            <span key={`${job.id}-${warning.code}`} title={warning.message}>
              {warning.code}
            </span>
          ))}
        </div>
      )}
      {job.error_summary && <p className="error">{job.error_summary}</p>}
      <div className="job-actions">
        <small>만료: {formatDate(job.expires_at)}</small>
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
    </article>
  );
}
