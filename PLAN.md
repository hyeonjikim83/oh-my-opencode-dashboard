# Oh-My-OpenCode Agent Usage Dashboard — 기획서

## 1. 프로젝트 개요

Oh-My-OpenCode에서 사용하는 AI 에이전트들의 사용량을 시각적으로 추적하는 대시보드.
로컬 opencode SQLite 데이터베이스를 읽어서 에이전트별/모델별/세션별 사용량, 비용, 토큰 소비를 분석한다.

### 환경 제약

- **로컬 전용 대시보드**: `~/.local/share/opencode/opencode.db` SQLite 파일을 `better-sqlite3`로 직접 읽으므로, 로컬 `next dev` 또는 로컬 빌드에서만 동작한다.
- 원격 배포(Vercel 등)는 스코프 밖. 향후 필요 시 API 레이어 추가 고려.
- `OPENCODE_DB_PATH` 환경변수로 DB 경로 오버라이드 가능.
- `OPENCODE_STORAGE_PATH` 환경변수로 스토리지 경로 오버라이드 가능 (레거시 호환).

### 사용 중인 에이전트 인프라

| 에이전트 타입 | 프로바이더 | 용도 |
|---|---|---|
| **Claude Code (Sisyphus)** | AWS Bedrock — `anthropic.claude-opus-4-6-v1` | 메인 오케스트레이터, 코드 작성/수정 |
| **Codex** | OpenAI — `gpt-5.3-codex` | 서브에이전트 (hephaestus, ultrabrain, deep 등) |
| **Antigravity** | Google — `gemini-3-pro/flash(Antigravity)`, Anthropic via AG | 서브에이전트 (visual-engineering, quick, writing 등) |

### Oh-My-OpenCode 에이전트 구성 (oh-my-opencode.json 기반)

**Named Agents:**
- `sisyphus` → Claude Opus 4.6 (AWS Bedrock) — 메인
- `hephaestus` → GPT-5.3 Codex (medium)
- `oracle` → GPT-5.2 (high) — 아키텍처 자문
- `librarian` → GLM-4.7 (free) — 레퍼런스 검색
- `explore` → GPT-5 Nano — 코드베이스 탐색
- `multimodal-looker` → Gemini 3 Flash — 이미지/PDF 분석
- `prometheus` → GPT-5.2 (high) — 플래닝
- `metis` → GPT-5.2 (high) — 사전 분석
- `momus` → GPT-5.2 (medium) — 리뷰
- `atlas` → GPT-5.2 — 범용
- `sisyphus-junior` → 카테고리별 서브 오케스트레이터
- `compaction` → 컨텍스트 압축

**Category → Model 매핑:**
- `visual-engineering` → Gemini 3 Pro
- `ultrabrain` → GPT-5.3 Codex (xhigh)
- `deep` → GPT-5.3 Codex (medium)
- `artistry` → Gemini 3 Pro (high)
- `quick` → Gemini 3 Flash
- `unspecified-low/high` → GPT-5.3 Codex (medium)
- `writing` → Gemini 3 Flash

---

## 2. 데이터 소스

### SQLite 데이터베이스

```
~/.local/share/opencode/opencode.db
```

- `better-sqlite3`로 readonly 모드로 접근
- 주요 테이블: `session`, `message`

### Session 테이블 스키마

```sql
-- session 테이블 컬럼
id              TEXT PRIMARY KEY
project_id      TEXT
parent_id       TEXT    -- 서브에이전트 세션의 부모 세션 ID (nullable)
slug            TEXT
directory       TEXT
title           TEXT
version         TEXT
summary_additions  INTEGER
summary_deletions  INTEGER
summary_files      INTEGER
time_created    INTEGER -- Unix timestamp (ms)
time_updated    INTEGER -- Unix timestamp (ms)
```

### Message 테이블 스키마

```sql
-- message 테이블 컬럼
id              TEXT PRIMARY KEY
session_id      TEXT    -- FK → session.id
data            TEXT    -- JSON blob (RawMessage 필드들)
time_created    INTEGER -- Unix timestamp (ms)
```

#### Message `data` JSON 구조

```json
{
  "role": "assistant",
  "time": {
    "created": 1770911462683,
    "completed": 1770911483215
  },
  "parentID": "msg_xxx",
  "modelID": "anthropic.claude-opus-4-6-v1",
  "providerID": "amazon-bedrock",
  "mode": "sisyphus",
  "agent": "sisyphus",
  "path": { "cwd": "...", "root": "/" },
  "cost": 0.15136875,
  "tokens": {
    "total": 22961,
    "input": 10,
    "output": 420,
    "reasoning": 0,
    "cache": {
      "read": 0,
      "write": 22531
    }
  },
  "variant": "max",
  "finish": "tool-calls"
}
```

### 레거시 파일시스템 경로 (참고용)

```
~/.local/share/opencode/storage/
├── session/global/          # 세션 메타데이터
├── message/{session_id}/    # 메시지 데이터
├── part/{message_id}/       # 메시지 파트 (tool calls)
└── ...
```

> **현재 구현**: SQLite DB 직접 읽기. 레거시 파일시스템 접근은 제거됨.

---

## 3. 택소노미 & 필드 우선순위

메시지에는 `agent`, `mode`, `modelID`, `providerID` 등 여러 분류 필드가 존재한다.
필드 간 충돌/누락 시 우선순위를 명확히 정의한다.

### 에이전트 식별 (핵심 그룹핑 키)

```
우선순위: msg.agent → msg.mode → "unknown"
```

- `agent` 필드가 있으면 그것이 에이전트 이름 (sisyphus, oracle, explore 등)
- `agent`가 없고 `mode`만 있으면 `mode`를 에이전트로 사용
- 둘 다 없으면 `"unknown"` 버킷

### 프로바이더 식별

```
우선순위: msg.providerID → msg.model?.providerID → "unknown"
```

### 모델 식별

```
우선순위: msg.modelID → msg.model?.modelID → "unknown"
```

### 프로바이더 정규화 (6개 버킷)

| providerID | 표시명 | 색상 | 과금 방식 |
|---|---|---|---|
| `amazon-bedrock` | Claude Code (Bedrock) | #F97316 (orange) | billing (달러) |
| `openai` | Codex (OpenAI) | #10B981 (emerald) | account (메시지 제한) |
| `google` | Antigravity (Google) | #8B5CF6 (violet) | account (메시지 제한) |
| `anthropic` | Anthropic (Direct) | #EC4899 (pink) | billing (달러) |
| `opencode` | OpenCode Zen | #3B82F6 (blue) | account (메시지 제한) |
| `copilot` | GitHub Copilot | #6366F1 (indigo) | account (메시지 제한) |
| 그 외 | Unknown Provider | #6B7280 (gray) | billing (기본값) |

### 과금 방식 (billingType)

- **billing**: API 호출당 달러 비용 발생 (Bedrock, Anthropic Direct). `cost` 필드 집계.
- **account**: 계정 기반 메시지 제한 (OpenAI, Google, OpenCode, Copilot). 일/주 메시지 카운트 추적.

```typescript
isProviderBilling(providerID: string): boolean
// billing 타입이면 true, account 타입이면 false
```

### 메시지 제한 (account 프로바이더)

| 프로바이더 | 주간 제한 | 일간 제한 |
|---|---|---|
| OpenAI | 1,000 | 200 |
| Google | 1,000 | 200 |
| OpenCode Zen | 500 | 100 |
| GitHub Copilot | 2,100 | 300 |

> 이 수치는 커뮤니티 리포트 기반 추정치. 실제 제한은 요금제에 따라 다를 수 있음.

### Category vs Agent

- **Agent**: 메시지 단위 필드. 대시보드의 **1차 그룹핑 키**.
- **Category**: oh-my-opencode.json에서 `task()` 호출 시 사용하는 분류. 메시지 데이터에 직접 저장되지 않으므로 대시보드에서는 agent 기준으로만 분석.
- 향후 category별 분석이 필요하면 agent → category 역매핑 테이블로 대응.

---

## 4. 집계 공식

### 시간 윈도우 정의

| 윈도우 | 기준 |
|---|---|
| **오늘** | 로컬 타임존 기준 `new Date().setHours(0,0,0,0)` 이후 |
| **이번 주** | 로컬 타임존 기준 현재 주의 월요일 00:00 이후 |
| **이번 달** | 로컬 타임존 기준 현재 달 1일 00:00 이후 |
| **전체** | 필터 없음 |

> 타임존: `Intl.DateTimeFormat().resolvedOptions().timeZone` 사용 (시스템 타임존).
> 주 시작: **월요일** (ISO 8601).

### 메시지 포함 규칙

- **비용 집계 대상**: `role === "assistant"` AND `cost !== undefined && cost > 0`
- **메시지 카운트**: `role === "assistant"` 메시지 중 `cost`가 존재하는 것만 (user 메시지는 비용 없음)
- **토큰 집계**: `tokens` 필드가 존재하는 assistant 메시지만
- **과금 비용 (billingCost)**: billing 타입 프로바이더의 cost만 합산

### 메트릭 공식

| 메트릭 | 공식 |
|---|---|
| **총 비용 (billingCost)** | `Σ msg.cost` (billing 프로바이더만) |
| **메시지 수** | 포함 규칙 충족하는 메시지 count |
| **Avg 비용/msg** | `총 비용 / 메시지 수` (0이면 0 표시) |
| **토큰 In** | `Σ msg.tokens.input` |
| **토큰 Out** | `Σ msg.tokens.output` |
| **캐시 히트율** | `Σ cache.read / (Σ cache.read + Σ tokens.input)` — "실제 읽기 중 캐시 비율" |
| **응답 시간** | `msg.time.completed - msg.time.created` (completed 없으면 제외) |
| **Avg 응답 시간** | `Σ 응답시간 / 유효 메시지 수` |
| **활성 세션** | `session.time.updated`가 24시간 이내인 세션 수 |
| **일간/주간 메시지** | account 프로바이더별 기간 내 메시지 수 (제한 대비 사용률) |

### 캐시 히트율 상세

```
cacheHitRate = Σ(cache.read) / (Σ(cache.read) + Σ(tokens.input))
```

- 분모가 0이면 0% 표시
- 의미: "전체 입력 토큰 중 캐시에서 재활용된 비율"
- `cache.write`는 히트율 계산에 포함하지 않음 (쓰기는 비용 발생)

---

## 5. 데이터 품질 & 폴백

### 필수/선택 필드 처리

| 필드 | 없을 때 처리 |
|---|---|
| `msg.agent` | `msg.mode` 사용, 둘 다 없으면 `"unknown"` |
| `msg.providerID` | `msg.model?.providerID` 사용, 없으면 `"unknown"` |
| `msg.modelID` | `msg.model?.modelID` 사용, 없으면 `"unknown"` |
| `msg.cost` | `0` 처리, 집계 대상에서 제외 |
| `msg.tokens` | 전체 0 처리, 토큰 집계에서 제외 |
| `msg.time.completed` | 응답 시간 계산에서 제외 |

### "unknown" 버킷

- `"unknown"` 에이전트/프로바이더/모델은 별도 행으로 표시
- UI에서 회색 처리, 정렬 시 맨 아래

### 에러 처리

| 상황 | 처리 |
|---|---|
| SQLite DB 파일 없음 | 빈 데이터 반환 (`getDb()` → `null`) |
| JSON 파싱 실패 (message.data) | 해당 메시지 skip |
| 세션은 있으나 메시지 없음 | 세션 표시, 비용/토큰 0으로 표시 |

### 성능 고려사항

- **현재 전략**: SQLite readonly 쿼리로 모든 세션/메시지 한 번에 읽기 (Server Component render 시)
- **SQLite 장점**: JSON 파일 개별 읽기 대비 훨씬 빠른 일괄 조회
- **규모 예상**: 일반적 사용 기준 세션 100~500개, 메시지 수천~수만 개
- **Next.js RSC revalidation**: `export const dynamic = 'force-dynamic'`으로 매 요청마다 최신 데이터 읽기

---

## 6. 대시보드 기능

### 6.1 Office Floor Map (항상 표시, 최상단)

활성 세션을 픽셀아트 스타일 사무실 평면도로 시각화.

- **최대 6개** 활성 세션을 "방(Room)"으로 표시
- 활성 기준: `updatedAt`이 15분 이내
- 각 방에 에이전트 픽셀 캐릭터가 표시됨
  - 캐릭터별 고유 색상 팔레트 (PAL 맵)
  - 상태 표시: working (5분 이내) / paused (15분 이내) / idle
  - sisyphus는 "delegating" / "thinking" / "idle"
  - 각 캐릭터 위에 프로바이더 아이콘 + 모델명 표시
- 방 테마: 다크/라이트 모드별 6가지 컬러 테마
- 방 내 가구 픽셀 스프라이트: 식물, 책상, 선반, 컴퓨터, 소파, 자판기, 화이트보드, 테이블
- 하단 상태 바: 총 토큰, 에이전트 가동률, 최근 활성 에이전트
- Framer Motion 입장 애니메이션

### 6.2 Summary Cards

- **총 비용** (billing 프로바이더만, 없으면 카드 숨김) — Today / Week 하위 표시
- **총 메시지 수** (assistant 메시지 중 cost 있는 것만 카운트)
- **총 토큰 소비** (input / output — 미니 breakdown)
- **활성 세션 수** (24시간 내 업데이트된 세션)

### 6.3 Provider Usage

프로바이더별 카드 목록. billing/account 타입에 따라 다른 표시:

- **billing 프로바이더** (Bedrock, Anthropic): 총 비용(달러) + 메시지 수
- **account 프로바이더** (OpenAI, Google, OpenCode, Copilot):
  - 메시지 수 (주요 지표)
  - 일간/주간 사용률 프로그레스 바 (제한 대비)
  - 80% 초과 시 빨강, 60% 초과 시 노랑, 기본 프로바이더 색상
- 각 카드에 사용 모델 목록 (상위 2개)
- 프로바이더 색상 글로우 효과

### 6.4 Agent Usage 테이블

| 에이전트 | 메시지 수 | 총 비용* | Avg 비용/msg* | 토큰 In/Out | 캐시 히트율 | Avg 응답시간 |
|---|---|---|---|---|---|---|

- 비용 컬럼(*): billing 프로바이더 에이전트가 하나라도 있을 때만 표시
- 정렬: 기본 총 비용 내림차순, 헤더 클릭으로 정렬 변경
- `"unknown"` 에이전트는 맨 아래 회색 표시
- 캐시 히트율: 인라인 프로그레스 바 + 퍼센트 (초록/노랑/빨강)

### 6.5 Latest Sessions 목록

- 최근 세션 20개 (최신순 정렬)
- 각 세션: 제목, 프로젝트 경로, billing 비용, 메시지 수, 기간, 업데이트 시각
- 최근 1시간 내 활성 세션에 초록 점 표시
- **서브에이전트 세션 트리**: 자식 세션이 있으면 expand/collapse 토글
  - 자식 세션 제목에서 `@{agent} subagent` 패턴 파싱하여 에이전트 메타 표시
  - 자식 세션 수 뱃지
- 클릭 → `/sessions/[id]` 세션 상세 드릴다운

### 6.6 시각화 컴포넌트 (구현 완료, 대시보드 미연결)

#### 구현 완료:
1. **VisualizationToggle** — on/off 토글 (localStorage 저장), `useVizMode` 훅
2. **AgentBubbles** — 에이전트별 원형 버블, 크기 = 메시지 수 비율 (sqrt 스케일), Framer Motion spring 애니메이션, hover 시 tooltip
3. **CostTreemap** — billing 프로바이더 전용 비용 트리맵, Provider > Model 계층, Recharts `<Treemap>`, 커스텀 content renderer
4. **UsageHeatmap** — 최근 30일 × 24시간 히트맵 (GitHub contributions 스타일), 바이올렛 색상 단계, hover tooltip
5. **TokenFlow** — 에이전트별 input/output/cache read Stacked Bar Chart (Recharts, horizontal layout)
6. **CacheGauge** — 에이전트별 캐시 히트율 수평 게이지, 단계별 색상 (빨강/노랑/초록), 전체 평균 상단 표시

#### 미완료 (TODO):
- DashboardContent에 VisualizationToggle + 시각화 컴포넌트 연결
- 토글 ON 시 시각화 표시, OFF 시 숨김

---

## 7. 네비게이션 & 드릴다운

### 라우팅 구조

```
/                           → 메인 대시보드 (Office Floor Map + Summary + Provider + Agent + Sessions)
/sessions/[sessionId]       → 세션 상세 (Summary Cards + Provider Breakdown + Subagent Sessions + Cost Breakdown + Message Timeline)
```

> `/sessions` 전체 목록 페이지는 미구현. 메인 대시보드의 Latest Sessions에서 직접 드릴다운.

### 세션 상세 페이지 (`/sessions/[sessionId]`)

- **Summary Cards**: Session Cost (billing만), Messages, Tokens In/Out, Duration
- **Provider Breakdown**: 프로바이더별 카드 (비용/메시지, 에이전트별 상세)
- **Subagent Sessions**: 자식 세션 목록 (에이전트 아이콘/라벨, 링크)
- **Cost Breakdown**: 에이전트별 도넛 차트 (AgentBreakdownChart, billing만)
- **Message Timeline**: 전체 메시지 시간순 (세션 트리 전체 포함), 에이전트 아이콘/프로바이더 색상 점/비용/토큰
- 뒤로가기 → 메인 대시보드

### 세션 트리 (parent/child)

- 메인 세션(parent)에서 `readMessagesForSessionTree()`로 자식 세션 메시지까지 통합 조회
- `readChildSessions(parentId)`로 자식 세션 메타데이터 조회
- aggregator에서 자식 → 부모로 메트릭 롤업 (비용, 메시지, 토큰, 에이전트)

---

## 8. 에러/로딩/빈 상태

### 에러 상태

| 상황 | UI |
|---|---|
| SQLite DB 파일 없음 | 빈 데이터 + EmptyState 표시 |
| 파일 읽기 권한 없음 | ErrorBanner 배너 경고 |
| message.data JSON 파싱 실패 | 해당 메시지 skip |

### 빈 상태

| 상황 | UI |
|---|---|
| 세션 0개 + 메시지 0개 | EmptyState: "No OpenCode sessions yet" + 🛰️ 애니메이션 |
| Office Floor Map 활성 세션 없음 | "No active sessions right now" |
| 특정 에이전트 데이터 없음 | 테이블에서 해당 행 생략 |
| 시각화 데이터 없음 | 각 컴포넌트별 빈 상태 메시지 |

### 로딩 상태

- Server Component 기반 + `loading.tsx` (Next.js Suspense boundary):
  - 스켈레톤 카드 4개 (Summary Cards 자리)
  - 스켈레톤 테이블 5행
  - 스켈레톤 리스트 4행
  - Shimmer 애니메이션 (다크/라이트 모드별)

### 404 상태

- `not-found.tsx`: 🛸 애니메이션 + "Page Not Found" + 대시보드 복귀 링크

---

## 9. 기술 스택

### Frontend
- **Next.js 15** (App Router, Server Components)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4** — 스타일링
- **Recharts 2** — 차트 라이브러리 (Treemap, PieChart, BarChart)
- **Framer Motion 12** — 애니메이션 (Office Floor Map, Agent Bubbles)

### 데이터 처리
- **better-sqlite3** — SQLite readonly 접근 (JSON 파일 대신)
- **Server Components** — DB에서 직접 쿼리 (API 불필요)
- 데이터 파싱 & 집계 → React Server Component에서 처리
- `export const dynamic = 'force-dynamic'` — 항상 최신 데이터

### 테마
- **다크/라이트 모드** — ThemeProvider (Context API) + ThemeToggle
- localStorage 기반 테마 저장
- `html.dark` / `html.light` 클래스로 전환
- globals.css에서 모드별 색상 오버라이드

### 프로젝트 구조
```
ohmyopencode-dashboard/
├── app/
│   ├── layout.tsx                  # 레이아웃 (헤더, 폰트, ThemeProvider) ✅
│   ├── page.tsx                    # 메인 대시보드 ✅
│   ├── loading.tsx                 # 스켈레톤 로딩 ✅
│   ├── not-found.tsx               # 404 페이지 ✅
│   ├── globals.css                 # 글로벌 스타일 (다크/라이트 모드) ✅
│   └── sessions/
│       └── [sessionId]/
│           └── page.tsx            # 세션 상세 ✅
├── components/
│   ├── ThemeProvider.tsx            # 다크/라이트 테마 Context ✅
│   ├── ThemeToggle.tsx              # 테마 토글 버튼 ✅
│   ├── dashboard/
│   │   ├── DashboardContent.tsx     # 대시보드 메인 컨텐츠 (Client) ✅
│   │   ├── SummaryCards.tsx         # 상단 요약 카드 ✅
│   │   ├── AgentTable.tsx           # 에이전트별 테이블 (정렬) ✅
│   │   ├── ProviderBreakdown.tsx    # 프로바이더별 분석 (billing/account) ✅
│   │   └── SessionList.tsx          # 세션 목록 (트리 expand/collapse) ✅
│   ├── visualizations/
│   │   ├── OfficeFloorMap.tsx       # 픽셀아트 사무실 맵 ✅
│   │   ├── VisualizationToggle.tsx  # on/off 토글 ✅ (미연결)
│   │   ├── AgentBubbles.tsx         # 에이전트 버블 차트 ✅ (미연결)
│   │   ├── CostTreemap.tsx          # 비용 트리맵 ✅ (미연결)
│   │   ├── TokenFlow.tsx            # 토큰 플로우 ✅ (미연결)
│   │   ├── UsageHeatmap.tsx         # 타임라인 히트맵 ✅ (미연결)
│   │   └── CacheGauge.tsx           # 캐시 효율 게이지 ✅ (미연결)
│   ├── session/
│   │   └── AgentBreakdownChart.tsx  # 세션 에이전트별 도넛 차트 ✅
│   └── ui/
│       ├── EmptyState.tsx           # 빈 상태 표시 ✅
│       └── ErrorBanner.tsx          # 에러 배너 ✅
├── lib/
│   ├── data/
│   │   ├── reader.ts               # SQLite DB 읽기 (better-sqlite3) ✅
│   │   ├── parser.ts               # 메시지 필드 추출 유틸 ✅
│   │   └── aggregator.ts           # 데이터 집계 로직 ✅
│   ├── types.ts                    # 타입 정의 ✅
│   ├── constants.ts                # 에이전트/모델/프로바이더 메타데이터 ✅
│   └── utils.ts                    # 포맷팅 유틸 (비용, 토큰, 시간) ✅
├── PLAN.md
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 10. 에이전트별 프로바이더 매핑 (constants.ts)

```typescript
export interface ProviderMeta {
  name: string;
  color: string;
  icon: string;
  billingType: "billing" | "account";
  weeklyMessageLimit?: number;
  dailyMessageLimit?: number;
  models?: Record<string, { name: string; free?: boolean }>;
}

export const PROVIDER_MAP: Record<string, ProviderMeta> = {
  'amazon-bedrock': {
    name: 'Claude Code (Bedrock)',
    color: '#F97316',
    icon: '🪨',
    billingType: 'billing',
    models: { /* Claude Opus 4.6, 4.5, Sonnet 4.5, 4, Haiku 4.5 */ },
  },
  'openai': {
    name: 'Codex (OpenAI)',
    color: '#10B981',
    icon: '🧠',
    billingType: 'account',
    weeklyMessageLimit: 1000,
    dailyMessageLimit: 200,
    models: { /* GPT 5.3 Codex ~ GPT 5 Nano */ },
  },
  'google': {
    name: 'Antigravity (Google)',
    color: '#8B5CF6',
    icon: '🚀',
    billingType: 'account',
    weeklyMessageLimit: 1000,
    dailyMessageLimit: 200,
    models: { /* Gemini 3 Pro, Flash */ },
  },
  'anthropic': {
    name: 'Anthropic (Direct)',
    color: '#EC4899',
    icon: '💬',
    billingType: 'billing',
    models: { /* Claude Opus 4.6 ~ Haiku 3.5 */ },
  },
  'opencode': {
    name: 'OpenCode Zen',
    color: '#3B82F6',
    icon: '✨',
    billingType: 'account',
    weeklyMessageLimit: 500,
    dailyMessageLimit: 100,
    models: { /* GPT 5 Nano(free), Kimi, MiniMax, GLM, Big Pickle, Trinity, Alpha, Qwen3 등 */ },
  },
  'copilot': {
    name: 'GitHub Copilot',
    color: '#6366F1',
    icon: '🐙',
    billingType: 'account',
    weeklyMessageLimit: 2100,
    dailyMessageLimit: 300,
    models: { /* Claude Sonnet 4, GPT-4o, GPT 5 */ },
  },
};

export const AGENT_META = {
  sisyphus:           { emoji: '🪨', label: 'Sisyphus',      role: 'Orchestrator' },
  hephaestus:         { emoji: '🔨', label: 'Hephaestus',    role: 'Builder' },
  oracle:             { emoji: '🔮', label: 'Oracle',         role: 'Advisor' },
  librarian:          { emoji: '📚', label: 'Librarian',      role: 'Researcher' },
  explore:            { emoji: '🔍', label: 'Explorer',       role: 'Scout' },
  prometheus:         { emoji: '🔥', label: 'Prometheus',     role: 'Planner' },
  metis:              { emoji: '🧩', label: 'Metis',          role: 'Analyst' },
  momus:              { emoji: '🎭', label: 'Momus',          role: 'Reviewer' },
  atlas:              { emoji: '🌍', label: 'Atlas',          role: 'Carrier' },
  'multimodal-looker':{ emoji: '👁️', label: 'Looker',        role: 'Vision' },
  'sisyphus-junior':  { emoji: '🪨', label: 'Sisyphus Jr.',  role: 'Sub-orchestrator' },
  compaction:         { emoji: '🗜️', label: 'Compaction',    role: 'Compressor' },
};
```

---

## 11. 핵심 집계 로직

```typescript
// 세션별 집계
interface SessionSummary {
  id: string;
  slug: string;
  title: string;
  directory: string;
  duration: number;        // ms (updated - created)
  createdAt: number;
  updatedAt: number;
  totalCost: number;       // 전체 cost 합산
  billingCost: number;     // billing 프로바이더 cost만
  messageCount: number;
  parentID?: string;       // 서브에이전트 세션의 부모 ID
  children: SessionSummary[];  // 자식 세션 목록
  agents: Record<string, {
    cost: number;
    messages: number;
    lastActiveAt: number;  // 에이전트 최근 활동 시각
    provider: string;
    model: string;
  }>;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

// 에이전트별 집계
interface AgentSummary {
  agent: string;
  totalCost: number;
  billingCost: number;       // billing 프로바이더 cost만
  messageCount: number;
  avgCostPerMessage: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokensReasoning: number;
  totalCacheRead: number;
  cacheHitRate: number;      // Σ(cache.read) / (Σ(cache.read) + Σ(input))
  avgResponseTime: number;   // completed가 있는 메시지만 대상
  models: string[];          // 사용된 모델 목록
  providers: string[];       // 사용된 프로바이더 목록
  hasBillingProvider: boolean;  // billing 프로바이더 사용 여부
}

// 프로바이더별 집계
interface ProviderSummary {
  provider: string;
  totalCost: number;
  totalMessages: number;
  models: Record<string, { cost: number; messages: number; tokens: number }>;
  todayMessages: number;     // 오늘 메시지 수
  weekMessages: number;      // 이번 주 메시지 수
  todayTokens: number;       // 오늘 토큰 수
  weekTokens: number;        // 이번 주 토큰 수
}

// 대시보드 전체 데이터
interface DashboardData {
  sessions: SessionSummary[];   // 루트 세션만 (자식은 .children에)
  agents: AgentSummary[];
  providers: ProviderSummary[];
  totals: {
    cost: number;
    billingCost: number;
    messages: number;
    sessions: number;
    tokens: { input; output; reasoning; cacheRead; cacheWrite; total };
    todayCost: number;
    weekCost: number;
    monthCost: number;
    todayBillingCost: number;
    weekBillingCost: number;
    monthBillingCost: number;
  };
  timeline: TimelineEntry[];
}

// 타임라인 항목 (히트맵용)
interface TimelineEntry {
  date: string;   // 'YYYY-MM-DD'
  hour: number;   // 0-23
  cost: number;
  messages: number;
}

// 트리맵 노드
interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  color?: string;
}
```

### Aggregator 주요 로직

1. **세션 초기화**: 모든 세션을 `SessionSummary`로 변환
2. **메시지 처리**: assistant 메시지 순회하며 세션/에이전트/프로바이더/타임라인 동시 집계
3. **billing 구분**: `isProviderBilling()`으로 billing/account 분기
4. **에이전트 통계 완료**: 평균 계산 (avgCostPerMessage, cacheHitRate, avgResponseTime)
5. **세션 트리 빌드**: 자식 세션을 부모에 attach, 메트릭 롤업
6. **루트 세션 반환**: `parentID`가 없는 세션만 최상위로, 최신순 정렬

---

## 12. 시각화 세부 사양

> 모든 시각화 컴포넌트 구현 완료. DashboardContent에 토글 연결만 남음.

### 12.1 Office Floor Map (구현 완료, Phase 1 포함)
- 활성 세션을 픽셀아트 사무실 방으로 표현
- 에이전트별 5×8 픽셀 캐릭터, 고유 색상 팔레트
- 방별 가구 스프라이트 세트 (6종)
- 다크/라이트 모드별 방 테마 (6종씩)
- 활동 상태: working/paused/idle (sisyphus는 delegating/thinking/idle)
- Framer Motion 입장 애니메이션
- **데이터**: `SessionSummary[]` (활성 세션만)

### 12.2 에이전트 버블 차트 (구현 완료)
- 원형 버블, 크기 = 메시지 수 비율 (sqrt 면적 스케일)
- 각 버블에 에이전트 이모지 + 이름 + 메시지 수
- hover 시 상세 정보 tooltip (메시지 수, 토큰, 캐시율)
- Framer Motion spring 애니메이션
- 색상: 첫 번째 프로바이더 색상 사용
- **데이터**: `AgentSummary[]`

### 12.3 비용 트리맵 (구현 완료)
- billing 프로바이더 전용
- Level 1: 프로바이더
- Level 2: 모델
- 커스텀 SVG content renderer (둥근 모서리)
- Recharts `<Treemap>` 사용
- **데이터**: `ProviderSummary[]` (billing만 필터)

### 12.4 타임라인 히트맵 (구현 완료)
- X축: 시간대 (0-23h)
- Y축: 날짜 (최근 30일)
- 셀 색상 강도 = 해당 시간대 메시지 수
- 바이올렛 4단계 색상 (#4c1d95 → #a78bfa)
- hover tooltip (날짜, 시각, 메시지 수)
- **데이터**: `TimelineEntry[]`

### 12.5 토큰 플로우 (구현 완료)
- 에이전트별 input/output/cache read Stacked Bar Chart
- Horizontal layout, 상위 10개 에이전트
- Recharts `<BarChart>` layout="vertical"
- 색상: Input 파랑 / Output 에메랄드 / Cache 앰버
- **데이터**: `AgentSummary[]`

### 12.6 캐시 효율 게이지 (구현 완료)
- 에이전트별 캐시 히트율 수평 게이지
- 단계별 색상: 0-30%(빨강) → 30-70%(노랑) → 70-100%(초록)
- 전체 평균 캐시율 상단 큰 텍스트
- **데이터**: `AgentSummary[].cacheHitRate`

---

## 13. 구현 순서 & 현재 상태

### Phase 1 — Core Dashboard ✅ 완료

| Step | 항목 | 상태 |
|---|---|---|
| ~~1~~ | ~~프로젝트 초기화~~ | ✅ Next.js + Tailwind + TypeScript |
| ~~2~~ | ~~타입 정의~~ | ✅ types.ts, constants.ts (6개 프로바이더, 12개 에이전트) |
| ~~3~~ | ~~데이터 리더~~ | ✅ reader.ts (SQLite), parser.ts |
| ~~4~~ | ~~데이터 집계~~ | ✅ aggregator.ts (세션 트리, billing 구분) |
| ~~5~~ | ~~유틸리티~~ | ✅ utils.ts (비용/토큰/시간/퍼센트 포맷팅) |
| ~~6~~ | ~~레이아웃 & 테마~~ | ✅ layout.tsx, globals.css, ThemeProvider (다크/라이트) |
| ~~7~~ | ~~Summary Cards~~ | ✅ billing 조건부 표시 |
| ~~8~~ | ~~Agent Table~~ | ✅ 정렬, billing 조건부 컬럼 |
| ~~9~~ | ~~Provider Breakdown~~ | ✅ billing/account 분기, 사용률 바 |
| ~~10~~ | ~~Session List~~ | ✅ 트리 expand/collapse, 서브에이전트 표시 |
| ~~11~~ | ~~Session Detail~~ | ✅ /sessions/[id], Provider Breakdown, 도넛 차트, 타임라인 |
| ~~12~~ | ~~에러/빈 상태~~ | ✅ EmptyState, ErrorBanner, loading.tsx, not-found.tsx |
| ~~13~~ | ~~Office Floor Map~~ | ✅ 픽셀아트 사무실, 에이전트 캐릭터 |

### Phase 2 — Visualizations & Polish

| Step | 항목 | 상태 |
|---|---|---|
| ~~14~~ | ~~VisualizationToggle~~ | ✅ 구현 (대시보드 미연결) |
| ~~15~~ | ~~Agent Bubbles~~ | ✅ 구현 (대시보드 미연결) |
| ~~16~~ | ~~Cost Treemap~~ | ✅ 구현 (대시보드 미연결) |
| ~~17~~ | ~~Usage Heatmap~~ | ✅ 구현 (대시보드 미연결) |
| ~~18~~ | ~~Token Flow~~ | ✅ 구현 (대시보드 미연결) |
| ~~19~~ | ~~Cache Gauge~~ | ✅ 구현 (대시보드 미연결) |
| 20 | 시각화 연결 | ❌ DashboardContent에 토글 + 시각화 컴포넌트 연결 |
| 21 | 프로젝트 필터 | ❌ 프로젝트별 필터링 드롭다운 |
| 22 | `/sessions` 목록 | ❌ 세션 전체 목록 페이지 (페이지네이션, 필터) |
| 23 | Final Polish | ❌ 반응형 미세조정, 성능 최적화, 애니메이션 |

---

## 14. 디자인 톤

- **베이스**: 다크 모드 (slate-950 배경) + 라이트 모드 지원
- **카드**: slate-900/80 배경, subtle border (slate-800/60), backdrop-blur
- **액센트**: 프로바이더별 색상 (오렌지/에메랄드/바이올렛/핑크/블루/인디고)
- **시각화**: 파스텔 톤 + 바이올렛 계열 히트맵
- **폰트**: Inter (sans, `--font-sans`), JetBrains Mono (숫자/코드, `--font-mono`)
- **수치 표시**: 비용 `$0.15`, 토큰 `22.9K`, 시간 `12.3s`, 퍼센트 `85.3%`
- **인터랙션**: card-hover 리프트 효과, gradient 오버레이, 글로우 도트
- **픽셀아트**: Office Floor Map 전용 5px/4px 그리드 캐릭터/가구 스프라이트
- **애니메이션**: fade-in-up (0.4s), float (3s 무한), shimmer (2s 무한)
- **전체 무드**: "개발자 친화적이면서 따뜻한" — 차갑지 않은 다크/라이트 테마
