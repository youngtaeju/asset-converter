from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()
celery_app = Celery(
    "asset_converter",
    broker=settings.redis_url,
    backend=settings.result_backend_url,
    include=["app.jobs.tasks"],
)
celery_app.conf.update(
    task_always_eager=settings.celery_always_eager,
    task_eager_propagates=False,
    task_soft_time_limit=210,
    task_time_limit=240,
    timezone="UTC",
    beat_schedule={
        "cleanup-expired-assets-every-15-minutes": {
            "task": "app.jobs.tasks.cleanup_expired_assets",
            "schedule": crontab(minute="*/15"),
        }
    },
)
