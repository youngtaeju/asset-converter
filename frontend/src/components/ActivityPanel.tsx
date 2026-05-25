import type { Job } from "../types";
import { HistoryPanel } from "./HistoryPanel";
import { JobsPanel } from "./JobsPanel";

export type ActivityTab = "jobs" | "history";

type ActivityPanelProps = {
  activeTab: ActivityTab;
  jobs: Job[];
  history: Job[];
  historyLimit: number;
  onTabChange: (tab: ActivityTab) => void;
};

export function ActivityPanel({
  activeTab,
  jobs,
  history,
  historyLimit,
  onTabChange,
}: ActivityPanelProps) {
  return (
    <section className="panel activity-panel">
      <div className="panel-header activity-header">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>{activeTab === "jobs" ? "진행 상태" : "최근 변환"}</h2>
        </div>
        <div className="activity-tabs" role="tablist" aria-label="작업 보기">
          <button
            className={
              activeTab === "jobs" ? "activity-tab active" : "activity-tab"
            }
            type="button"
            role="tab"
            aria-selected={activeTab === "jobs"}
            onClick={() => onTabChange("jobs")}
          >
            진행 중 <span>{jobs.length}</span>
          </button>
          <button
            className={
              activeTab === "history" ? "activity-tab active" : "activity-tab"
            }
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => onTabChange("history")}
          >
            최근 변환 <span>{history.length}</span>
          </button>
        </div>
      </div>

      {activeTab === "jobs" ? (
        <JobsPanel jobs={jobs} />
      ) : (
        <HistoryPanel history={history} limit={historyLimit} />
      )}
    </section>
  );
}
