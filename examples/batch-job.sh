#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
TARGET="${TARGET:-webp}"

if [ "$#" -lt 1 ]; then
  echo "Usage: TARGET=webp examples/batch-job.sh <file> [file ...]" >&2
  exit 2
fi

form_args=()
for file in "$@"; do
  form_args+=("-F" "files[]=@${file}")
done

curl -sS -X POST "${BASE_URL}/api/jobs/batch" \
  "${form_args[@]}" \
  -F "target_format=${TARGET}"
