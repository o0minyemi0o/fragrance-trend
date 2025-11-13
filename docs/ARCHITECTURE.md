# 아키텍처 문서

## 시스템 개요

Fragrance Trend MCP Agent는 Model Context Protocol을 기반으로 하는 자동화된 향수 트렌드 분석 시스템입니다.

## 핵심 컴포넌트

### 1. MCP Server (`src/mcp/server.ts`)

**역할**: MCP 프로토콜을 통한 외부 통신 담당

**주요 기능**:
- MCP 도구 등록 및 관리
- 요청/응답 처리
- 에러 핸들링

**제공 도구**:
- `collect_fragrance_data`: 외부 소스에서 데이터 수집
- `analyze_trends`: AI를 활용한 트렌드 분석
- `create_notion_report`: Notion 리포트 생성
- `run_full_pipeline`: 전체 파이프라인 실행
- `get_job_status`: 작업 상태 조회

### 2. FragranceTrendAgent (`src/agent/FragranceTrendAgent.ts`)

**역할**: 핵심 비즈니스 로직 조율

**책임**:
- 데이터 수집 조율
- AI 분석 요청
- Notion 리포트 생성
- 작업 상태 관리

**데이터 흐름**:
```
수집 → 저장 → 분석 → Notion 업로드
```

### 3. Data Collectors (`src/data-collectors/`)

**구조**:
```
BaseCollector (추상 클래스)
├── FragranticaCollector
├── GoogleTrendsCollector
└── TwitterCollector
```

**특징**:
- 재시도 로직 (지수 백오프)
- 에러 처리
- 로깅

### 4. AI Analyzer (`src/ai/analyzer.ts`)

**지원 AI 모델**:
- Anthropic Claude
- OpenAI GPT
- Fallback: 규칙 기반 분석

**분석 항목**:
- 요약 (summary)
- 핵심 트렌드 (key_trends)
- 인기 향수 (top_fragrances)
- 트렌딩 키워드 (trending_keywords)
- 인사이트 (insights)
- 감성 점수 (sentiment_score)

### 5. Notion Client (`src/notion/client.ts`)

**기능**:
- 페이지 생성
- 페이지 업데이트
- 기존 리포트 검색
- 구조화된 콘텐츠 생성

**리포트 구조**:
```
📊 Executive Summary
🔥 Key Trends
⭐ Top Fragrances
🔍 Trending Keywords
💡 Insights
Data Summary
```

### 6. Job Manager (`src/state/job-manager.ts`)

**작업 생명주기**:
```
pending → running → completed/failed
```

**기능**:
- 작업 생성 및 추적
- 진행률 관리
- 에러 기록
- 오래된 작업 정리

### 7. Scheduler (`src/scheduler/index.ts`)

**모드**:
- **자동 스케줄**: Cron 표현식에 따라 주기적 실행
- **즉시 실행**: 요청 시 즉시 리포트 생성

**모니터링**:
- 작업 상태 추적
- 완료/실패 로깅
- 타임아웃 처리

## 데이터 흐름

### 전체 파이프라인

```
┌─────────────────┐
│  MCP Request    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Job Created    │
│  (pending)      │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Data Collection (10% progress)     │
│  ├─ Fragrantica API                 │
│  ├─ Google Trends API               │
│  └─ Twitter API                     │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Data Stored (in-memory)            │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  AI Analysis (50% progress)         │
│  ├─ Build prompt                    │
│  ├─ Call AI API                     │
│  └─ Parse response                  │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Analysis Stored                    │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Notion Report (80% progress)       │
│  ├─ Check existing                  │
│  ├─ Create/Update page              │
│  └─ Format content                  │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Job Completed (100%)               │
│  └─ Return Notion URL               │
└─────────────────────────────────────┘
```

## 에러 처리 전략

### 1. 데이터 수집
- **재시도**: 최대 3회, 지수 백오프 (1s, 2s, 4s)
- **Fallback**: Mock 데이터 사용
- **로깅**: 상세한 에러 로그

### 2. AI 분석
- **Fallback**: 규칙 기반 분석
- **파싱 에러**: 기본 결과 반환

### 3. Notion API
- **재시도**: 네트워크 에러 시
- **중복 방지**: 기존 리포트 검색

### 4. 작업 관리
- **상태 추적**: 모든 단계에서 상태 업데이트
- **타임아웃**: 10분 후 모니터링 중단
- **정리**: 24시간 이상 된 작업 자동 삭제

## 확장성 고려사항

### 현재 제한사항
- In-memory 데이터 저장 (프로세스 재시작 시 손실)
- 단일 인스턴스 실행
- Mock 데이터 사용 (일부 API)

### 프로덕션 권장사항

1. **데이터베이스 통합**
   - Redis: 작업 상태 관리
   - PostgreSQL/MongoDB: 수집 데이터 및 분석 결과 영구 저장

2. **메시지 큐**
   - RabbitMQ/SQS: 비동기 작업 처리
   - 분산 처리 지원

3. **모니터링**
   - Prometheus/Grafana: 메트릭 수집
   - Sentry: 에러 추적
   - CloudWatch/Datadog: 로그 집계

4. **API 통합**
   - 실제 API 구현 (현재 mock)
   - Rate limiting
   - API 키 로테이션

5. **보안**
   - 환경 변수 암호화
   - Secrets Manager 사용
   - API 키 검증

## 성능 최적화

### 병렬 처리
- 데이터 수집: 3개 소스 병렬 실행
- AI 분석: 배치 처리 고려

### 캐싱
- API 응답 캐싱
- Notion 페이지 조회 캐싱

### 리소스 관리
- 연결 풀링
- 메모리 제한 설정
- 타임아웃 설정

## 테스트 전략

### 단위 테스트
- 각 collector 독립 테스트
- AI analyzer mocking
- Notion client mocking

### 통합 테스트
- 전체 파이프라인 테스트
- 에러 시나리오 테스트

### E2E 테스트
- 실제 API 연동 테스트 (staging 환경)
