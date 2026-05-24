# 변환 정책

Asset Converter는 변환 결과가 사용자가 기대한 의미와 달라질 수 있는 경우 API/UI metadata에 warning을 포함합니다. 지원하지 않는 입력 또는 변환 조합은 변환 전에 거부됩니다.

## 지원 매트릭스

| 입력 | 출력 | 엔진 | 정책 |
| --- | --- | --- | --- |
| GIF | MP4 | FFmpeg | 24 fps, 짝수 해상도 보정, libx264, CRF 26, slow preset, yuv420p, faststart 적용 |
| GIF | WebP | FFmpeg | 24 fps, 짝수 해상도 보정, libwebp, quality 75, yuva420p, loop 0 적용 |
| GIF | JPG/JPEG/PNG | Pillow | 첫 프레임을 정적 이미지로 추출하고 animation 제거 warning 반환 |
| JPG/JPEG | PNG/WebP/JPG/JPEG | Pillow | 컨테이너 변환. JPG/JPEG→PNG는 품질 개선이 아님을 warning으로 반환 |
| PNG | JPG/JPEG/WebP/PNG | Pillow | JPG/JPEG 출력 시 투명 배경을 `background_color`로 flattening하고 warning 반환 |
| WebP | JPG/JPEG/PNG/WebP | Pillow | WebP를 정적 이미지로 변환. JPG/JPEG 출력은 lossy/flattening warning을 반환할 수 있으며, 정적 출력에서는 첫 프레임 추출/animation 제거 warning을 반환 |
| 정적 이미지 | MP4 | N/A | MVP 범위에서 지원하지 않음 |

## Warning codes

| 코드 | 의미 |
| --- | --- |
| `TRANSPARENCY_FLATTENED` | alpha channel이 설정된 배경색으로 합성됨 |
| `FIRST_FRAME_EXTRACTED` | animated input에서 첫 프레임만 사용해 정적 output을 생성함 |
| `LOSSY_OUTPUT` | output이 lossy compression을 사용함 |
| `QUALITY_NOT_IMPROVED` | 컨테이너 변경만으로 품질 또는 용량 개선을 기대하기 어려움 |
| `ANIMATION_DROPPED` | output format이 animation을 보존하지 않아 animation이 제거됨 |

## 안전 규칙

- 파일 확장자만 신뢰하지 않고 MIME/signature 기반으로 입력 포맷을 감지합니다.
- 입력 포맷은 GIF, JPEG, PNG, WebP만 허용합니다.
- 업로드 파일은 UUID job 디렉터리 아래의 관리되는 temp root에 저장합니다.
- 사용자가 제공한 파일명은 filesystem path로 직접 사용하지 않습니다.
- 설정된 업로드 크기와 batch 파일 수 제한을 초과하면 구조화된 오류를 반환합니다.
- FFmpeg stderr는 저장하거나 반환하기 전에 길이를 제한하고 sanitize합니다.

## 파일 보관 정책

원본 파일과 결과 파일은 `ASSET_TTL_HOURS` 기준으로 만료됩니다. 만료된 파일은 cleanup 작업으로 삭제되며, metadata는 history 조회를 위해 SQLite에 남습니다. 만료된 결과 다운로드 요청은 `410 RESULT_EXPIRED`를 반환합니다.
