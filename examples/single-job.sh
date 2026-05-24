#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
FILE="${1:?Usage: examples/single-job.sh <file> [target_format]}"
TARGET="${2:-mp4}"

curl -sS -X POST "${BASE_URL}/api/jobs" \
  -F "file=@${FILE}" \
  -F "target_format=${TARGET}"
