# Fragrance Trend MCP Agent

MCP(Model Context Protocol) 기반 AI Agent로 Notion에 향수 트렌드 리포트를 자동으로 생성합니다.

## 주요 기능

### 1. 데이터 수집
- **Fragrantica**: 향수 정보 및 인기도 데이터
- **Google Trends**: 검색 트렌드 및 관련 키워드
- **Twitter/X**: 소셜 미디어 언급 및 반응

### 2. AI 분석
- Claude 또는 GPT를 활용한 트렌드 분석
- 핵심 트렌드 및 인사이트 도출
- 인기 향수 및 키워드 선정

### 3. Notion 통합
- 자동으로 리포트 생성 또는 업데이트
- 구조화된 데이터베이스 관리
- 시각적으로 보기 좋은 포맷팅

### 4. 자동화
- Cron 스케줄러를 통한 주기적 실행
- 작업 상태 관리 및 모니터링
- 오류 처리 및 재시도 로직

## 설치

```bash
# 의존성 설치
npm install

# TypeScript 컴파일
npm run build
```

## 설정

`.env` 파일을 생성하고 다음 환경 변수를 설정하세요:

```bash
# Notion API 설정
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id

# AI API 설정 (둘 중 하나 선택)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# 외부 데이터 소스 (선택사항)
FRAGRANTICA_API_KEY=your_fragrantica_api_key
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
GOOGLE_TRENDS_API_KEY=your_google_trends_api_key

# 스케줄러 설정
CRON_SCHEDULE=0 9 * * 1  # 매주 월요일 오전 9시
TIMEZONE=Asia/Seoul

# 로깅
LOG_LEVEL=info
```

### Notion 설정

1. [Notion Integrations](https://www.notion.so/my-integrations)에서 새 통합 생성
2. 통합 토큰 복사 → `NOTION_API_KEY`
3. Notion 데이터베이스 생성 (다음 속성 포함):
   - Title (제목)
   - Generated At (날짜)
   - Sentiment Score (숫자)
   - Status (선택)
4. 데이터베이스를 통합에 연결
5. 데이터베이스 ID 복사 → `NOTION_DATABASE_ID`

## 사용 방법

### 1. MCP 서버 모드

MCP 프로토콜을 통해 외부에서 제어:

```bash
npm run dev  # 또는 npm start
```

사용 가능한 MCP 도구:
- `collect_fragrance_data`: 데이터 수집
- `analyze_trends`: 트렌드 분석
- `create_notion_report`: Notion 리포트 생성
- `run_full_pipeline`: 전체 파이프라인 실행
- `get_job_status`: 작업 상태 확인

### 2. 스케줄러 모드

주기적으로 자동 실행:

```bash
npm run dev scheduler
# 또는
node dist/index.js scheduler
```

### 3. 일회성 실행

즉시 리포트 생성:

```bash
npm run dev once
# 또는
node dist/index.js once
```

## 아키텍처

```
src/
├── agent/                  # 메인 AI Agent
│   └── FragranceTrendAgent.ts
├── ai/                     # AI 분석 모듈
│   └── analyzer.ts
├── config/                 # 설정 관리
│   └── index.ts
├── data-collectors/        # 데이터 수집기
│   ├── base.ts
│   ├── fragrantica.ts
│   ├── google-trends.ts
│   └── twitter.ts
├── mcp/                    # MCP 서버
│   └── server.ts
├── notion/                 # Notion 클라이언트
│   └── client.ts
├── scheduler/              # 스케줄러
│   └── index.ts
├── state/                  # 상태 관리
│   └── job-manager.ts
├── types/                  # TypeScript 타입
│   └── index.ts
├── utils/                  # 유틸리티
│   └── logger.ts
└── index.ts               # 진입점
```

## MCP 프로토콜 흐름

```
1. 데이터 수집 (MCP 메시지)
   ↓
2. AI 분석 및 요약
   ↓
3. Notion API 통신
   ↓
4. 상태 관리 및 알림
   ↓
5. 완료 또는 재시도
```

## 작업 상태 관리

- **pending**: 대기 중
- **running**: 실행 중
- **completed**: 완료
- **failed**: 실패

## 개발

```bash
# 개발 모드 (hot reload)
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## 트러블슈팅

### API 키 오류
- `.env` 파일에 필수 API 키가 설정되어 있는지 확인
- Notion 통합이 데이터베이스에 연결되어 있는지 확인

### 데이터 수집 실패
- API 키가 유효한지 확인
- 현재 mock 데이터를 사용 중이므로 실제 API 통합 필요

### Notion 연결 오류
- 데이터베이스 스키마가 올바른지 확인
- 통합 권한이 충분한지 확인

## 라이선스

MIT

## 기여

Pull Request를 환영합니다!
