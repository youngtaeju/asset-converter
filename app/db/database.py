import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import Settings, ensure_runtime_dirs, get_settings
from app.models import JobStatus

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  input_format TEXT NOT NULL,
  target_format TEXT NOT NULL,
  input_size_bytes INTEGER NOT NULL,
  output_size_bytes INTEGER,
  duration_ms INTEGER,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  error_summary TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  expires_at TEXT,
  source_path TEXT NOT NULL,
  result_path TEXT,
  preset TEXT NOT NULL DEFAULT 'default',
  background_color TEXT NOT NULL DEFAULT '#ffffff'
);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
"""

TERMINAL = {JobStatus.succeeded.value, JobStatus.failed.value, JobStatus.expired.value}


def utc_now() -> datetime:
    return datetime.now(UTC)


def to_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def parse_iso(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


class JobStore:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        ensure_runtime_dirs(self.settings)
        self.path: Path = self.settings.sqlite_path
        self.init_db()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA journal_mode=WAL")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def init_db(self) -> None:
        with self.connect() as conn:
            conn.executescript(SCHEMA)

    def create_job(self, job: dict[str, Any]) -> dict[str, Any]:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO jobs (
                    id, status, source_filename, input_format, target_format, input_size_bytes,
                    warnings_json, created_at, expires_at, source_path, preset, background_color
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job["id"],
                    job["status"],
                    job["source_filename"],
                    job["input_format"],
                    job["target_format"],
                    job["input_size_bytes"],
                    json.dumps(job.get("warnings", [])),
                    job["created_at"],
                    job.get("expires_at"),
                    job["source_path"],
                    job.get("preset", "default"),
                    job.get("background_color", "#ffffff"),
                ),
            )
        return self.get_job(job["id"])  # type: ignore[return-value]

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return self._row_to_dict(row) if row else None

    def list_jobs(
        self, limit: int = 50, offset: int = 0, status: str | None = None
    ) -> list[dict[str, Any]]:
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        with self.connect() as conn:
            if status:
                rows = conn.execute(
                    "SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    (status, limit, offset),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    (limit, offset),
                ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def transition(self, job_id: str, new_status: JobStatus, **fields: Any) -> dict[str, Any]:
        current = self.get_job(job_id)
        if current is None:
            raise KeyError(job_id)
        if current["status"] in TERMINAL and current["status"] != JobStatus.succeeded.value:
            return current
        if current["status"] == JobStatus.succeeded.value and new_status not in {
            JobStatus.succeeded,
            JobStatus.expired,
        }:
            return current

        update: dict[str, Any] = {"status": new_status.value}
        update.update(fields)
        if "warnings" in update:
            update["warnings_json"] = json.dumps(update.pop("warnings"))
        columns = ", ".join(f"{key} = ?" for key in update)
        values = list(update.values()) + [job_id]
        with self.connect() as conn:
            conn.execute(f"UPDATE jobs SET {columns} WHERE id = ?", values)
        return self.get_job(job_id)  # type: ignore[return-value]

    def mark_expired(self, job_id: str, expired_at: datetime | None = None) -> dict[str, Any]:
        return self.transition(
            job_id,
            JobStatus.expired,
            finished_at=to_iso(expired_at or utc_now()),
            result_path=None,
        )

    def expired_terminal_jobs(self, now: datetime | None = None) -> list[dict[str, Any]]:
        now_iso = to_iso(now or utc_now())
        with self.connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM jobs
                WHERE status = ? AND expires_at IS NOT NULL AND expires_at <= ?
                """,
                (JobStatus.succeeded.value, now_iso),
            ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def _row_to_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        data = dict(row)
        data["warnings"] = json.loads(data.pop("warnings_json") or "[]")
        return data
