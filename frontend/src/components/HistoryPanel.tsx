import { downloadFilename, formatDate } from "../lib/format";
import { statusLabels } from "../lib/job-status";
import type { Job } from "../types";

type HistoryPanelProps = {
  history: Job[];
};

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <div className="history-panel" role="tabpanel">
      {history.length === 0 ? (
        <p className="empty">최근 변환 기록이 없습니다.</p>
      ) : (
        <div className="history-list">
          {history.map((job) => (
            <div className="history-item" key={job.id}>
              <div className="history-topline">
                <div className="history-meta">
                  <span>{job.source_filename}</span>
                  <small>
                    {job.input_format} → {job.target_format} ·{" "}
                    {statusLabels[job.status]} · {formatDate(job.created_at)}
                  </small>
                </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
