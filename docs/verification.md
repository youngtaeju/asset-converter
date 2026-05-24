# 검증 체크리스트

이 문서는 로컬 개발과 배포 전 확인에 사용하는 기본 검증 절차입니다.

## 로컬 체크

```bash
uv run ruff check .
uv run python -m mypy app
uv run pytest -q
npm run build --prefix frontend
```

## Docker smoke test

```bash
docker compose build
docker compose up -d
curl -fsS http://localhost:3000/ >/dev/null
curl -fsS http://localhost:8000/api/health
curl -fsS http://localhost:8000/docs >/dev/null
```

## End-to-end 변환 smoke test

```bash
INPUT_FILE="${INPUT_FILE:?set INPUT_FILE to a local GIF path}"
COOKIE_JAR="$(mktemp)"
JOB_ID=$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST http://localhost:8000/api/jobs \
  -F "file=@${INPUT_FILE}" \
  -F "target_format=mp4" | python -c 'import json,sys; print(json.load(sys.stdin)["job"]["id"])')

curl -sS -b "$COOKIE_JAR" "http://localhost:8000/api/jobs/${JOB_ID}"
curl -L -b "$COOKIE_JAR" -o result.mp4 "http://localhost:8000/api/jobs/${JOB_ID}/download"
test -s result.mp4
```

## 수동 확인 항목

- UI에서 GIF→MP4 업로드, polling, warning, 다운로드 동작 확인
- UI에서 GIF→WebP 업로드, polling, warning, 다운로드 동작 확인
- UI에서 PNG transparency→JPG 변환 시 flattening warning 확인
- API 단일 job 생성, status 조회, 다운로드 확인
- API batch 요청에서 valid/invalid 파일 혼합 처리 확인
- 만료된 결과 다운로드 시 metadata는 남고 `410 RESULT_EXPIRED`가 반환되는지 확인
