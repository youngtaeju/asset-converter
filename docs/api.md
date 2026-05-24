# API 참조

Asset Converter는 FastAPI 기반 REST API를 제공합니다. 실행 중인 서버에서는 `/docs`에서 OpenAPI UI를, `/openapi.json`에서 원본 OpenAPI schema를 확인할 수 있습니다. 웹 UI는 별도 `frontend` 컨테이너가 제공하며 `/api` 요청을 FastAPI로 프록시합니다.

## `GET /api/health`

서비스 상태를 확인합니다.

응답 예시:

```json
{ "status": "ok" }
```

## 업로드 제한

기본 파일당 업로드 제한은 `ASSET_MAX_UPLOAD_MB=100`입니다. Docker Compose의 `frontend` nginx 업로드 제한도 기본 `100m`으로 맞춰져 있습니다. 더 큰 값을 사용하려면 애플리케이션 설정과 프록시 설정을 함께 조정해야 합니다.

## `POST /api/jobs`

단일 파일 변환 job을 생성합니다. 요청은 `multipart/form-data` 형식입니다.

### Form fields

| 필드 | 필수 여부 | 설명 |
| --- | --- | --- |
| `file` | 필수 | 변환할 업로드 파일 |
| `target_format` | 필수 | `mp4`, `webp`, `jpg`, `jpeg`, `png` 중 하나 |
| `preset` | 선택 | 변환 preset. 기본값은 `default` |
| `background_color` | 선택 | 투명 배경을 flattening할 때 사용할 hex 색상. 기본값은 `#ffffff` |

응답 상태: `202 Accepted`

응답 예시:

```json
{
  "job": {
    "id": "uuid",
    "status": "queued",
    "download_available": false
  }
}
```

## `POST /api/jobs/batch`

여러 파일에 대해 변환 job을 생성합니다. 일부 파일이 실패해도 유효한 파일은 accepted 처리됩니다.

### Form fields

| 필드 | 필수 여부 | 설명 |
| --- | --- | --- |
| `files[]` | 필수 | 반복 가능한 업로드 파일 필드 |
| `target_format` | 필수 | `mp4`, `webp`, `jpg`, `jpeg`, `png` 중 하나 |
| `preset` | 선택 | 변환 preset. 기본값은 `default` |
| `background_color` | 선택 | 투명 배경을 flattening할 때 사용할 hex 색상. 기본값은 `#ffffff` |

응답 상태: `202 Accepted`

응답 예시:

```json
{
  "jobs": [],
  "accepted_count": 0,
  "rejected": [
    {
      "source_filename": "bad.txt",
      "error": {
        "code": "UNSUPPORTED_MEDIA_TYPE",
        "message": "Unsupported input media type.",
        "details": {}
      }
    }
  ]
}
```

batch 파일 수가 `ASSET_MAX_BATCH_FILES`를 초과하면 `413` 응답을 반환합니다.

## `GET /api/jobs/{job_id}`

job의 현재 metadata를 조회합니다.

주요 응답 필드:

| 필드 | 설명 |
| --- | --- |
| `id` | job ID |
| `status` | `queued`, `running`, `succeeded`, `failed`, `expired` 중 하나 |
| `source_filename` | 업로드 원본 파일명 |
| `input_format` | 감지된 입력 포맷 |
| `target_format` | 요청한 출력 포맷 |
| `warnings` | 변환 과정의 주의 사항 목록 |
| `error_summary` | 실패 시 안전하게 요약된 오류 메시지 |
| `expires_at` | 결과 파일 만료 시각 |
| `download_available` | 다운로드 가능 여부 |

알 수 없는 job ID는 `404` 응답을 반환합니다.

## `GET /api/jobs/{job_id}/download`

변환이 성공했고 결과 파일이 만료되지 않은 경우 변환 결과를 다운로드합니다.

오류 응답:

| 상태 코드 | 의미 |
| --- | --- |
| `404` | job을 찾을 수 없음 |
| `409` | 변환이 완료되지 않았거나 실패함 |
| `410` | 결과 파일이 만료됨 |

## `GET /api/history`

파일 blob을 제외한 변환 metadata history를 조회합니다. 원본 파일이나 결과 파일 자체는 반환하지 않습니다.

Query parameters:

| 파라미터 | 설명 |
| --- | --- |
| `limit` | 조회할 최대 job 수. 응답에서는 1~100 범위로 보정됨 |
| `offset` | 조회 시작 offset. 음수 값은 0으로 보정됨 |
| `status` | 특정 job 상태로 필터링 |

## 오류 응답 형식

애플리케이션에서 직접 처리하는 오류는 다음 형식을 사용합니다.

```json
{
  "error": {
    "code": "RESULT_EXPIRED",
    "message": "The converted file is no longer available.",
    "details": {
      "expired_at": "ISO-8601"
    }
  }
}
```

FastAPI validation 오류나 일부 framework-level 오류는 `detail` 필드를 사용하는 기본 FastAPI 응답 형식으로 반환될 수 있습니다.
