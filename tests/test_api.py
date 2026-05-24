from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


def make_png(path: Path):
    Image.new("RGBA", (2, 2), (255, 0, 0, 128)).save(path, "PNG")


def configure_runtime(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("ASSET_TEMP_ROOT", str(tmp_path / "temp"))
    monkeypatch.setenv("ASSET_DATA_ROOT", str(tmp_path / "data"))
    monkeypatch.setenv("ASSET_SQLITE_PATH", str(tmp_path / "data" / "jobs.sqlite3"))
    monkeypatch.setenv("ASSET_CELERY_ALWAYS_EAGER", "true")


def test_health():
    assert TestClient(app).get("/api/health").json() == {"status": "ok"}


def test_root_describes_api():
    response = TestClient(app).get("/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Asset Converter API",
        "docs": "/docs",
        "health": "/api/health",
    }


def test_reject_unsupported_upload(tmp_path):
    client = TestClient(app)
    response = client.post(
        "/api/jobs",
        files={"file": ("bad.txt", b"hello", "text/plain")},
        data={"target_format": "webp"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_create_png_to_jpg_job_eager(tmp_path, monkeypatch):
    configure_runtime(monkeypatch, tmp_path)
    img = tmp_path / "sample.png"
    make_png(img)
    client = TestClient(app)
    with img.open("rb") as f:
        response = client.post(
            "/api/jobs",
            files={"file": ("sample.png", f, "image/png")},
            data={"target_format": "jpg"},
        )
    assert response.status_code == 202
    body = response.json()["job"]
    assert body["input_format"] == "png"
    assert body["target_format"] == "jpg"
    assert any(w["code"] == "TRANSPARENCY_FLATTENED" for w in body["warnings"])

    download = client.get(f"/api/jobs/{body['id']}/download")

    assert download.status_code == 200
    assert download.headers["content-disposition"] == 'attachment; filename="sample.jpg"'


def test_history_and_download_are_scoped_to_session(tmp_path, monkeypatch):
    configure_runtime(monkeypatch, tmp_path)
    img = tmp_path / "private.png"
    make_png(img)
    owner = TestClient(app)
    other = TestClient(app)

    with img.open("rb") as f:
        response = owner.post(
            "/api/jobs",
            files={"file": ("private.png", f, "image/png")},
            data={"target_format": "jpg"},
        )

    assert response.status_code == 202
    assert "asset_session" in owner.cookies
    job_id = response.json()["job"]["id"]

    owner_history = owner.get("/api/history")
    other_history = other.get("/api/history")

    assert [job["id"] for job in owner_history.json()["jobs"]] == [job_id]
    assert other_history.json()["jobs"] == []
    assert other.get(f"/api/jobs/{job_id}").status_code == 404
    assert other.get(f"/api/jobs/{job_id}/download").status_code == 404
    assert owner.get(f"/api/jobs/{job_id}/download").status_code == 200


def test_celery_app_registers_conversion_tasks():
    from app.jobs.celery_app import celery_app

    celery_app.loader.import_default_modules()

    assert "app.jobs.tasks.convert_job" in celery_app.tasks
    assert "app.jobs.tasks.cleanup_expired_assets" in celery_app.tasks
