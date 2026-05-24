# Asset Converter MVP

Asset Converter는 이미지와 애니메이션 미디어를 웹 UI와 REST API로 변환하는 자체 호스팅 자산 변환 서비스입니다. FastAPI 기반 API 서버, Celery worker, Redis, SQLite, FFmpeg, Pillow, Vite/React 프론트엔드로 구성되며 uv lockfile과 Docker Compose 실행 환경을 제공합니다.

## 지원 변환

- GIF → MP4
- GIF → WebP
- JPG/JPEG/PNG/WebP 상호 변환
- 웹 이미지 → WebP 최적화
- Animated GIF/WebP → 첫 프레임 기반 정적 이미지 추출

MVP 범위에서는 정적 이미지를 MP4로 변환하는 요청을 지원하지 않습니다.

## 실행 구조

`docker compose up`을 실행하면 다음 서비스가 시작됩니다.

| 서비스 | 역할 |
| --- | --- |
| `frontend` | Vite/React 웹 UI를 nginx로 서빙하고 `/api` 요청을 FastAPI로 프록시 |
| `api` | FastAPI REST API와 OpenAPI 문서 제공 |
| `worker` | 변환 작업을 실행하는 Celery worker |
| `scheduler` | 만료된 파일을 정리하는 Celery beat scheduler |
| `redis` | Celery broker/result backend |

Docker named volume은 다음 용도로 사용됩니다.

- `asset_temp`: UUID job 디렉터리 단위로 관리되는 임시 원본/결과 파일
- `asset_data`: SQLite metadata database

## 빠른 시작

```bash
# 선택 사항: cp .env.example .env
docker compose up --build
```

실행 후 다음 주소에서 서비스를 확인할 수 있습니다.

- Web UI: <http://localhost:3000/>
- API docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/health>

정상 응답 예시:

```json
{ "status": "ok" }
```

## API 예시

단일 변환 job 생성:

```bash
curl -sS -X POST http://localhost:8000/api/jobs \
  -F "file=@path/to/input.gif" \
  -F "target_format=mp4"
```

job 상태 조회:

```bash
curl -sS http://localhost:8000/api/jobs/<job-id>
```

완료된 결과 다운로드:

```bash
curl -L -o result.mp4 http://localhost:8000/api/jobs/<job-id>/download
```

여러 파일 batch 변환 요청:

```bash
curl -sS -X POST http://localhost:8000/api/jobs/batch \
  -F "files[]=@path/to/input.png" \
  -F "files[]=@path/to/unsupported.txt" \
  -F "target_format=webp"
```

추가 예시는 [`examples/`](examples/)에서 확인할 수 있습니다.

## 설정

| 환경 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `ASSET_TEMP_ROOT` | `asset_temp` | 원본/결과 파일을 저장하는 임시 디렉터리 |
| `ASSET_DATA_ROOT` | `asset_data` | metadata 저장 디렉터리 |
| `ASSET_SQLITE_PATH` | `asset_data/jobs.sqlite3` | SQLite metadata database 경로 |
| `REDIS_URL` | `redis://redis:6379/0` | Celery broker URL |
| `CELERY_RESULT_BACKEND` | `REDIS_URL` 값 | Celery result backend URL |
| `ASSET_CELERY_ALWAYS_EAGER` | `false` | 테스트/로컬 실행에서 Celery 작업을 동기 실행할지 여부 |
| `ASSET_TTL_HOURS` | `24` | 원본/결과 파일 보관 시간 |
| `ASSET_MAX_UPLOAD_MB` | `100` | 파일당 업로드 제한. 기본 `frontend` nginx 업로드 제한도 100MB로 맞춰져 있음 |
| `ASSET_MAX_BATCH_FILES` | `20` | batch 요청당 최대 파일 수 |
| `ASSET_MAX_ANIMATED_SECONDS` | `30` | animated input 최대 길이 |
| `ASSET_MAX_ANIMATED_FRAMES` | `720` | animated input 최대 프레임 수 |
| `ASSET_FFMPEG_TIMEOUT_SECONDS` | `180` | FFmpeg 실행 제한 시간 |

## 변환 정책

변환 과정에서 사용자에게 보이는 의미가 바뀔 수 있는 경우 API는 warning을 함께 반환합니다. 예를 들어 투명 배경 flattening, lossy output, 품질 개선 효과가 낮은 변환, 첫 프레임 추출, animation 제거 등이 해당됩니다.

자세한 내용은 [`docs/conversion-policy.md`](docs/conversion-policy.md)를 참고할 수 있습니다.

## 파일 보관 정책

원본 파일과 결과 파일은 임시로만 보관됩니다. 정리 작업 이후에도 metadata는 SQLite에 남지만, 만료된 결과를 다운로드하려고 하면 HTTP `410`과 `RESULT_EXPIRED` 에러가 반환됩니다.

정리 작업은 `scheduler` 서비스에서 주기적으로 실행되며, `api`/`worker` 시작 시점에도 보조적으로 실행됩니다.

## 개발

백엔드 개발 환경은 Python 3.14와 `uv`로 준비합니다. `uv sync`는 `uv.lock`을 기준으로 project environment를 동기화합니다.

```bash
uv sync --extra dev
ASSET_CELERY_ALWAYS_EAGER=true uv run uvicorn app.main:app --reload
```

프론트엔드 개발 서버는 별도 터미널에서 실행합니다. 로컬 Vite 서버는 `/api` 요청을 `http://localhost:8000`으로 프록시합니다.

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

권장 검증 명령:

```bash
uv run ruff check .
uv run python -m mypy app
uv run pytest -q
npm run build --prefix frontend
```

## 라이선스

MIT. 자세한 내용은 [`LICENSE`](LICENSE)를 참고할 수 있습니다.
