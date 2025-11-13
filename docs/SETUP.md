# 설정 가이드

## 사전 요구사항

- Node.js 20.x 이상
- npm 또는 yarn
- Notion 계정
- (선택) OpenAI 또는 Anthropic API 키

## 1. 프로젝트 설치

```bash
# 저장소 클론
git clone <repository-url>
cd fragrance-trend

# 의존성 설치
npm install

# TypeScript 컴파일
npm run build
```

## 2. Notion 설정

### 2.1 Integration 생성

1. [Notion Integrations](https://www.notion.so/my-integrations) 페이지 접속
2. "+ New integration" 클릭
3. 설정:
   - Name: "Fragrance Trend Agent"
   - Associated workspace: 사용할 워크스페이스 선택
   - Capabilities:
     - ✓ Read content
     - ✓ Update content
     - ✓ Insert content
4. "Submit" 클릭
5. **Integration Token 복사** (나중에 사용)

### 2.2 데이터베이스 생성

1. Notion에서 새 페이지 생성
2. "/database" 입력하여 데이터베이스 생성
3. 다음 속성 추가:

| 속성 이름 | 타입 | 설명 |
|----------|------|------|
| Title | 제목 | 리포트 제목 |
| Generated At | 날짜 | 생성 일시 |
| Sentiment Score | 숫자 | 감성 점수 (0-1) |
| Status | 선택 | 상태 (Published 등) |

4. 데이터베이스를 Integration에 연결:
   - 데이터베이스 페이지 우측 상단 "..." 클릭
   - "Add connections" 클릭
   - 생성한 Integration 선택

5. **데이터베이스 ID 복사**:
   - 데이터베이스 URL: `https://notion.so/workspace/DATABASE_ID?v=...`
   - `DATABASE_ID` 부분 복사

## 3. AI API 설정

### 옵션 A: Anthropic Claude (권장)

1. [Anthropic Console](https://console.anthropic.com/) 접속
2. API Keys 생성
3. 키 복사 (나중에 사용)

**장점**:
- 더 나은 분석 품질
- 긴 컨텍스트 지원

### 옵션 B: OpenAI GPT

1. [OpenAI Platform](https://platform.openai.com/) 접속
2. API Keys 생성
3. 키 복사 (나중에 사용)

### 옵션 C: AI 없이 사용

AI API 키 없이도 기본 규칙 기반 분석으로 작동합니다.

## 4. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```bash
# 필수: Notion 설정
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 선택: AI API (둘 중 하나 또는 둘 다)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 선택: 외부 데이터 소스
# 현재는 mock 데이터를 사용하므로 선택사항입니다
FRAGRANTICA_API_KEY=your_key_here
TWITTER_BEARER_TOKEN=your_token_here
GOOGLE_TRENDS_API_KEY=your_key_here

# 선택: 스케줄러 설정
CRON_SCHEDULE=0 9 * * 1  # 매주 월요일 오전 9시
TIMEZONE=Asia/Seoul

# 선택: 로깅
LOG_LEVEL=info  # debug, info, warn, error
```

## 5. 외부 API 설정 (선택사항)

### Twitter API

1. [Twitter Developer Portal](https://developer.twitter.com/) 접속
2. App 생성
3. Bearer Token 생성
4. `.env`에 추가

**참고**: 현재는 mock 데이터를 사용하므로 즉시 시작 가능합니다.

### Google Trends API

공식 API가 없으므로 [google-trends-api](https://www.npmjs.com/package/google-trends-api) 패키지 사용을 고려하세요.

### Fragrantica API

공식 API가 없습니다. 프로덕션에서는 다음 옵션 고려:
- 웹 스크래핑 (허가 필요)
- 대체 향수 데이터베이스 API

## 6. 테스트 실행

```bash
# 일회성 실행으로 테스트
npm run dev once
```

성공 시 Notion 데이터베이스에 새 리포트가 생성됩니다!

## 7. 프로덕션 배포

### 옵션 A: 로컬 서버

```bash
# 빌드
npm run build

# 스케줄러 모드로 실행
NODE_ENV=production node dist/index.js scheduler
```

### 옵션 B: Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js", "scheduler"]
```

### 옵션 C: PM2

```bash
# PM2 설치
npm install -g pm2

# 앱 시작
pm2 start dist/index.js --name fragrance-trend -- scheduler

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

### 옵션 D: Systemd (Linux)

```ini
[Unit]
Description=Fragrance Trend MCP Agent
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/fragrance-trend
ExecStart=/usr/bin/node dist/index.js scheduler
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 8. MCP 클라이언트와 연동

Claude Desktop이나 다른 MCP 클라이언트에서 사용:

```json
{
  "mcpServers": {
    "fragrance-trend-agent": {
      "command": "node",
      "args": ["/path/to/fragrance-trend/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 문제 해결

### Notion 연결 오류

```
Error: Notion API error: unauthorized
```

**해결책**:
1. Integration token이 올바른지 확인
2. 데이터베이스가 Integration에 연결되어 있는지 확인
3. Integration에 적절한 권한이 있는지 확인

### 데이터베이스 ID 오류

```
Error: Could not find database
```

**해결책**:
1. 데이터베이스 URL에서 ID를 정확히 복사했는지 확인
2. 하이픈(-)이 포함되어 있다면 제거

### AI API 오류

```
Error: API key invalid
```

**해결책**:
1. API 키가 올바르게 복사되었는지 확인
2. API 키에 충분한 크레딧이 있는지 확인
3. AI 없이 실행하려면 해당 환경 변수를 제거

### 스케줄러가 실행되지 않음

**해결책**:
1. Cron 표현식이 올바른지 확인: https://crontab.guru/
2. 타임존 설정 확인
3. 로그에서 에러 메시지 확인

## 다음 단계

- [API 문서](./API.md) 읽기
- [아키텍처 문서](./ARCHITECTURE.md) 읽기
- 실제 API 통합 구현
- 프로덕션 데이터베이스 추가
