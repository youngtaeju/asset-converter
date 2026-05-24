from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.config import ensure_runtime_dirs
from app.db.database import JobStore
from app.jobs.tasks import cleanup_expired_files_sync

ensure_runtime_dirs()
JobStore()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    cleanup_expired_files_sync()
    yield


app = FastAPI(title="Asset Converter", version="0.1.0", lifespan=lifespan)


app.include_router(router)


@app.get("/")
def index() -> dict[str, str]:
    return {
        "name": "Asset Converter API",
        "docs": "/docs",
        "health": "/api/health",
    }
