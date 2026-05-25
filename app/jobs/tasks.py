from pathlib import Path

from app.config import get_settings
from app.conversion.engine import convert_asset
from app.db.database import JobStore, to_iso, utc_now
from app.jobs.celery_app import celery_app
from app.models import ConversionTarget, JobStatus
from app.storage.files import remove_tree


@celery_app.task(name="app.jobs.tasks.convert_job", bind=True)
def convert_job(self, job_id: str) -> dict:
    store = JobStore()
    row = store.get_job(job_id)
    if not row:
        return {"status": "missing"}
    terminal_statuses = {
        JobStatus.succeeded.value,
        JobStatus.failed.value,
        JobStatus.expired.value,
    }
    if row["status"] in terminal_statuses:
        return {"status": row["status"]}
    started = utc_now()
    store.transition(job_id, JobStatus.running, started_at=to_iso(started))
    try:
        result_path = Path(
            row.get("result_path")
            or Path(row["source_path"]).parent / f"result.{row['target_format']}"
        )
        result = convert_asset(
            Path(row["source_path"]),
            result_path,
            row["input_format"],
            ConversionTarget(row["target_format"]),
            row.get("background_color") or "#ffffff",
            get_settings(),
            row.get("conversion_options") or None,
        )
        updated = store.transition(
            job_id,
            JobStatus.succeeded,
            finished_at=to_iso(utc_now()),
            output_size_bytes=result.output_size_bytes,
            duration_ms=result.duration_ms,
            warnings=result.warnings,
            result_path=str(result.output_path),
        )
        return {"status": updated["status"], "job_id": job_id}
    except Exception as exc:  # noqa: BLE001 - task boundary must persist safe failure
        store.transition(
            job_id,
            JobStatus.failed,
            finished_at=to_iso(utc_now()),
            error_summary=str(exc)[:1000],
        )
        return {"status": "failed", "job_id": job_id}


def cleanup_expired_files_sync() -> dict:
    store = JobStore()
    removed = 0
    for row in store.expired_terminal_jobs():
        for field in ("source_path", "result_path"):
            value = row.get(field)
            if value:
                path = Path(value)
                root = path.parent
                if path.exists():
                    path.unlink()
                    removed += 1
                if root.exists():
                    remove_tree(root)
        store.mark_expired(row["id"])
    return {"removed_files": removed}


@celery_app.task(name="app.jobs.tasks.cleanup_expired_assets")
def cleanup_expired_assets() -> dict:
    return cleanup_expired_files_sync()
