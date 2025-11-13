# API 문서

## MCP Tools

### 1. collect_fragrance_data

향수 데이터를 다양한 소스에서 수집합니다.

**Input Schema**:
```json
{
  "sources": ["fragrantica", "google_trends", "twitter"],
  "keywords": ["perfume", "fragrance", "cologne"]
}
```

**Parameters**:
- `sources` (required): 데이터를 수집할 소스 배열
  - `fragrantica`: Fragrantica 향수 데이터
  - `google_trends`: Google 검색 트렌드
  - `twitter`: Twitter 소셜 미디어 언급
- `keywords` (optional): 검색 키워드 배열

**Response**:
```json
{
  "success": true,
  "data_id": "uuid-v4",
  "message": "Data collection completed",
  "summary": {
    "fragrances_collected": 10,
    "trends_collected": 5,
    "social_mentions": 100
  }
}
```

### 2. analyze_trends

수집된 데이터를 AI로 분석합니다.

**Input Schema**:
```json
{
  "data_id": "uuid-v4"
}
```

**Parameters**:
- `data_id` (required): 수집된 데이터의 ID

**Response**:
```json
{
  "success": true,
  "analysis_id": "uuid-v4",
  "summary": "Analysis summary text...",
  "key_trends": [
    "Trend 1",
    "Trend 2",
    "..."
  ],
  "top_fragrances": [
    {
      "name": "Fragrance Name",
      "brand": "Brand Name",
      "popularity_score": 95.5
    }
  ]
}
```

### 3. create_notion_report

Notion에 리포트를 생성하거나 업데이트합니다.

**Input Schema**:
```json
{
  "analysis_id": "uuid-v4",
  "report_title": "Weekly Fragrance Trend Report - 2024-01-01"
}
```

**Parameters**:
- `analysis_id` (required): 분석 결과 ID
- `report_title` (required): Notion 리포트 제목

**Response**:
```json
{
  "success": true,
  "notion_page_url": "https://notion.so/...",
  "message": "Report created successfully in Notion"
}
```

### 4. run_full_pipeline

전체 파이프라인을 실행합니다 (수집 → 분석 → 리포트 생성).

**Input Schema**:
```json
{
  "keywords": ["perfume", "niche perfume"],
  "report_title": "Custom Report Title"
}
```

**Parameters**:
- `keywords` (optional): 검색 키워드 배열 (기본값: ["perfume", "fragrance", "cologne"])
- `report_title` (required): Notion 리포트 제목

**Response**:
```json
{
  "success": true,
  "job_id": "uuid-v4",
  "message": "Full pipeline started. Use get_job_status to track progress."
}
```

### 5. get_job_status

작업의 현재 상태를 조회합니다.

**Input Schema**:
```json
{
  "job_id": "uuid-v4"
}
```

**Parameters**:
- `job_id` (required): 조회할 작업 ID

**Response**:
```json
{
  "id": "uuid-v4",
  "status": "running",
  "stage": "Analyzing trends with AI",
  "progress": 50,
  "started_at": "2024-01-01T00:00:00.000Z",
  "completed_at": null,
  "error": null
}
```

**Status Values**:
- `pending`: 대기 중
- `running`: 실행 중
- `completed`: 완료
- `failed`: 실패

## 사용 예제

### 예제 1: 기본 데이터 수집

```json
{
  "name": "collect_fragrance_data",
  "arguments": {
    "sources": ["fragrantica", "google_trends"],
    "keywords": ["niche perfume", "luxury fragrance"]
  }
}
```

### 예제 2: 전체 파이프라인 실행

```json
{
  "name": "run_full_pipeline",
  "arguments": {
    "keywords": ["perfume", "eau de parfum", "cologne"],
    "report_title": "Monthly Fragrance Trends - January 2024"
  }
}
```

### 예제 3: 작업 상태 확인

```json
{
  "name": "get_job_status",
  "arguments": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## 에러 응답

모든 도구는 에러 발생 시 다음 형식으로 응답합니다:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Detailed error message"
    }
  ],
  "isError": true
}
```

## Rate Limits

현재 버전에는 rate limit이 없지만, 외부 API의 제한사항을 고려하세요:

- **Twitter API**: 15분당 180 요청
- **Google Trends**: 일일 제한 있음
- **Notion API**: 초당 3 요청

## 타임아웃

- 데이터 수집: 최대 5분
- AI 분석: 최대 2분
- Notion 업로드: 최대 1분
- 전체 파이프라인: 최대 10분
