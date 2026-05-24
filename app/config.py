import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    temp_root: Path = Path(os.getenv("ASSET_TEMP_ROOT", "asset_temp"))
    data_root: Path = Path(os.getenv("ASSET_DATA_ROOT", "asset_data"))
    sqlite_path: Path = Path(os.getenv("ASSET_SQLITE_PATH", "asset_data/jobs.sqlite3"))
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    result_backend_url: str = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://redis:6379/0"))
    max_upload_mb: int = int(os.getenv("ASSET_MAX_UPLOAD_MB", "100"))
    max_batch_files: int = int(os.getenv("ASSET_MAX_BATCH_FILES", "20"))
    max_animated_seconds: int = int(os.getenv("ASSET_MAX_ANIMATED_SECONDS", "30"))
    max_animated_frames: int = int(os.getenv("ASSET_MAX_ANIMATED_FRAMES", "720"))
    ffmpeg_timeout_seconds: int = int(os.getenv("ASSET_FFMPEG_TIMEOUT_SECONDS", "180"))
    ttl_hours: float = float(os.getenv("ASSET_TTL_HOURS", "24"))
    celery_always_eager: bool = os.getenv("ASSET_CELERY_ALWAYS_EAGER", "false").lower() in {
        "1",
        "true",
        "yes",
    }

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


def get_settings() -> Settings:
    return Settings()


def ensure_runtime_dirs(settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    settings.temp_root.mkdir(parents=True, exist_ok=True)
    settings.data_root.mkdir(parents=True, exist_ok=True)
    settings.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
