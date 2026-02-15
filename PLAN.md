# Oh-My-OpenCode Agent Usage Dashboard — 기획서

## 1. 프로젝트 개요

Oh-My-OpenCode에서 사용하는 AI 에이전트들의 사용량을 시각적으로 추적하는 대시보드.
로컬 opencode 세션 데이터를 읽어서 에이전트별/모델별/세션별 사용량, 비용, 토큰 소비를 분석한다.

### 환경 제약

- **로컬 전용 대시보드**: `~/.local/share/opencode/storage/`를 `fs`로 직접 읽으므로, 로컬 `next dev` 또는 로컬 빌드에서만 동작한다.
- 원격 배포(Vercel 등)는 스코프 밖. 향후 필요 시 API 레이어 추가 고려.
- `OPENCODE_STORAGE_PATH` 환경변수로 경로 오버라이드 가능.

### 사용 중인 에이전트 인프라

| 에이전트 타입 | 프로바이더 | 용도 |
|---|---|---|
| **Claude Code (Sisyphus)** | AWS Bedrock — `anthropic.claude-opus-4-6-v1` | 메인 오케스트레이터, 코드 작성/수정 |
| **Codex** | OpenAI — `gpt-5.3-codex` | 서브에이전트 (hephaestus, ultrabrain, deep 등) |
| **Antigravity** | Google — `gemini-3-pro/flash`, Anthropic via AG | 서브에이전트 (visual-engineering, quick, writing 등) |

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

### 경로
```
~/.local/share/opencode/storage/
├── session/global/          # 세션 메타데이터         ← 사용
│   └── {session_id}.json
├── message/{session_id}/    # 메시지 데이터           ← 사용 (핵심)
│   └── {message_id}.json
├── part/{message_id}/       # 메시지 파트 (tool calls) ← Phase 2 이후 고려
│   └── {part_id}.json
├── agent-usage-reminder/    # 에이전트 사용 리마인더   ← 스코프 밖
├── session_diff/            # 세션별 코드 변경 요약    ← 스코프 밖
└── project/                 # 프로젝트 메타데이터      ← 스코프 밖
```

> **Phase 1 스코프**: `session/global/` + `message/{session_id}/` 만 사용.
> `part/`, `session_diff/`, `project/`는 Phase 2 이후 필요 시 추가.

### 세션 스키마 (`session/global/{id}.json`)
```json
{
  "id": "ses_xxx",
  "slug": "silent-otter",
  "version": "1.1.61",
  "projectID": "global",
  "directory": "/path/to/project",
  "title": "Session Title",
  "time": {
    "created": 1770910519983,
    "updated": 1770913072499
  },
  "summary": {
    "additions": 0,
    "deletions": 0,
    "files": 0
  }
}
```

### 메시지 스키마 (`message/{session_id}/{msg_id}.json`)
```json
{
  "id": "msg_xxx",
  "sessionID": "ses_xxx",
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

### 프로바이더 정규화 (4개 버킷)

| providerID | 표시명 | 색상 |
|---|---|---|
| `amazon-bedrock` | Claude Code (Bedrock) | #F97316 (orange) |
| `openai` | Codex (OpenAI) | #10B981 (emerald) |
| `google` | Antigravity (Google) | #8B5CF6 (violet) |
| `anthropic` | Anthropic (Direct) | #EC4899 (pink) |
| 그 외 | Unknown Provider | #6B7280 (gray) |

> 기존 plan은 3개 프로바이더만 언급했으나, `constants.ts`에 이미 `anthropic` 직접 호출도 포함되어 있음. 4개로 통일.

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

### 메트릭 공식

| 메트릭 | 공식 |
|---|---|
| **총 비용** | `Σ msg.cost` (포함 규칙 충족하는 메시지) |
| **메시지 수** | 포함 규칙 충족하는 메시지 count |
| **Avg 비용/msg** | `총 비용 / 메시지 수` (0이면 0 표시) |
| **토큰 In** | `Σ msg.tokens.input` |
| **토큰 Out** | `Σ msg.tokens.output` |
| **캐시 히트율** | `Σ cache.read / (Σ cache.read + Σ tokens.input)` — "실제 읽기 중 캐시 비율" |
| **응답 시간** | `msg.time.completed - msg.time.created` (completed 없으면 제외) |
| **Avg 응답 시간** | `Σ 응답시간 / 유효 메시지 수` |
| **활성 세션** | `session.time.updated`가 24시간 이내인 세션 수 |

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

### 파일 오류 처리

| 상황 | 처리 |
|---|---|
| JSON 파싱 실패 | 해당 파일 skip, console.warn 출력 |
| 스토리지 디렉토리 없음 | 빈 데이터 + 안내 메시지 표시 |
| 세션 디렉토리 있으나 메시지 없음 | 세션은 표시, 비용/토큰 0으로 표시 |
| 파일 읽기 권한 없음 | skip + 경고 |

### 성능 고려사항

- **현재 전략**: 모든 세션/메시지를 한 번에 읽음 (Server Component render 시)
- **규모 예상**: 일반적 사용 기준 세션 100~500개, 메시지 수천~수만 개
- **Phase 1**: 전체 로드 (수만 개까지는 충분히 빠를 것으로 예상)
- **Phase 2**: 성능 문제 발생 시 → 날짜 기반 필터링 (디렉토리 레벨), 페이지네이션, 또는 SQLite 캐시 도입 검토
- **Next.js RSC revalidation**: `export const dynamic = 'force-dynamic'`으로 매 요청마다 최신 데이터 읽기

---

## 6. 대시보드 기능

### 6.1 Summary Cards (항상 표시)
- **총 비용** (전체 / 오늘 / 이번주 / 이번달 — 탭 전환)
- **총 메시지 수** (assistant 메시지 중 cost 있는 것만 카운트)
- **총 토큰 소비** (input / output / cache read — 미니 breakdown)
- **활성 세션 수** (24시간 내 업데이트된 세션)

### 6.2 에이전트별 사용량 테이블
| 에이전트 | 메시지 수 | 총 비용 | Avg 비용/msg | 토큰 In | 토큰 Out | 캐시 히트율 | Avg 응답시간 |
|---|---|---|---|---|---|---|---|

- 정렬: 기본 총 비용 내림차순, 헤더 클릭으로 정렬 변경
- `"unknown"` 에이전트는 맨 아래 회색 표시

### 6.3 프로바이더별 비용 분석
- **4개 프로바이더 카드**: Bedrock / OpenAI / Google / Anthropic(Direct)
- 각 카드: 총 비용, 메시지 수, 사용 모델 목록
- 도넛 차트로 비율 시각화

### 6.4 세션 목록
- 최근 세션 목록 (최신순 정렬)
- 각 세션: 제목, 프로젝트 경로, 기간, 비용, 메시지 수
- 클릭 → 세션 상세 드릴다운

### 6.5 시각화 (토글 on/off)

#### 시각화 모드 ON:
1. **에이전트 아바타 버블 차트** — 각 에이전트를 이모지로 표시, 크기 = 비용 비율
2. **비용 트리맵** — 프로바이더 > 모델 > 에이전트 hierarchy, 파스텔 색상
3. **타임라인 히트맵** — 시간대별 사용량 (GitHub contribution 스타일)
4. **토큰 플로우** — input→output 비율 Sankey/bar 시각화
5. **캐시 효율 게이지** — 에이전트별 캐시 히트율 게이지

#### 시각화 모드 OFF:
- 순수 숫자 테이블 + 미니 인라인 바 차트만 표시

---

## 7. 네비게이션 & 드릴다운

### 라우팅 구조

```
/                           → 메인 대시보드 (Summary + Agent Table + Provider)
/sessions                   → 세션 전체 목록 (페이지네이션, 필터)
/sessions/[sessionId]       → 세션 상세 (메시지 타임라인, 에이전트별 비용 breakdown)
```

### 드릴다운 경로

```
메인 대시보드
├─ 에이전트 행 클릭 → 해당 에이전트 메시지가 포함된 세션 목록 필터링
├─ 프로바이더 카드 클릭 → 해당 프로바이더 모델 상세
├─ 세션 행 클릭 → /sessions/[id] 세션 상세
└─ Summary Card "이번주" 등 → 해당 기간으로 필터 적용

세션 상세
├─ 메시지 타임라인 (시간순, 에이전트 색상 구분)
├─ 세션 내 에이전트별 비용 파이차트
└─ 뒤로가기 → 메인 대시보드
```

### 필터링 (메인 대시보드)

| 필터 | 타입 | 기본값 |
|---|---|---|
| 기간 | 탭: 오늘 / 이번주 / 이번달 / 전체 | 전체 |
| 프로젝트 | 드롭다운 (session.directory 기반 고유 목록) | 전체 |

> Phase 1에서는 기간 필터만 구현. 프로젝트 필터는 Phase 2.

---

## 8. 에러/로딩/빈 상태

### 에러 상태

| 상황 | UI |
|---|---|
| 스토리지 경로 없음 | 전체 화면 안내: "opencode 스토리지를 찾을 수 없습니다. OPENCODE_STORAGE_PATH를 확인하세요." |
| 파일 읽기 권한 없음 | 배너 경고: "일부 세션 데이터를 읽을 수 없습니다." |
| 파싱 실패 (corrupt JSON) | 무시 + 대시보드 하단에 "N개 파일 파싱 실패" 작은 알림 |

### 빈 상태

| 상황 | UI |
|---|---|
| 세션 0개 | 일러스트 + "아직 opencode 세션이 없습니다. 첫 세션을 시작해보세요!" |
| 특정 에이전트 데이터 없음 | 테이블에서 해당 행 생략 (빈 행 표시 안 함) |
| 기간 필터 후 데이터 없음 | "선택한 기간에 데이터가 없습니다." |

### 로딩 상태

- Server Component 기반이므로 별도 로딩 스피너 불필요 (서버에서 렌더 후 전송)
- 단, 느린 경우를 대비해 `loading.tsx` (Next.js Suspense boundary) 배치:
  - 스켈레톤 카드 4개 (Summary Cards 자리)
  - 스켈레톤 테이블 5행

---

## 9. 기술 스택

### Frontend
- **Next.js 15** (App Router, Server Components)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4** — 스타일링
- **Recharts** — 차트 라이브러리 (**확정**, Nivo 대비 번들 크기 작고 Treemap/PieChart 등 필요 차트 모두 지원)
- **Framer Motion** — 애니메이션 (Phase 2 시각화에서 사용)

### 데이터 처리
- **Server Components** — 파일시스템에서 직접 JSON 읽기 (API 불필요)
- `fs.readdir` + `fs.readFile`로 opencode storage 디렉토리 스캔
- 데이터 파싱 & 집계 → React Server Component에서 처리
- `export const dynamic = 'force-dynamic'` — 항상 최신 데이터

### 프로젝트 구조
```
ohmyopencode-dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 메인 대시보드
│   ├── loading.tsx                 # 스켈레톤 로딩
│   ├── globals.css
│   └── sessions/
│       ├── page.tsx                # 세션 목록
│       └── [sessionId]/
│           └── page.tsx            # 세션 상세
├── components/
│   ├── dashboard/
│   │   ├── SummaryCards.tsx         # 상단 요약 카드
│   │   ├── AgentTable.tsx           # 에이전트별 테이블
│   │   ├── ProviderBreakdown.tsx    # 프로바이더별 분석
│   │   └── SessionList.tsx          # 세션 목록
│   ├── visualizations/
│   │   ├── VisualizationToggle.tsx  # on/off 토글 (Phase 2)
│   │   ├── AgentBubbles.tsx         # 에이전트 버블 차트 (Phase 2)
│   │   ├── CostTreemap.tsx          # 비용 트리맵 (Phase 2)
│   │   ├── TokenFlow.tsx            # 토큰 플로우 (Phase 2)
│   │   ├── UsageHeatmap.tsx         # 타임라인 히트맵 (Phase 2)
│   │   └── CacheGauge.tsx           # 캐시 효율 게이지 (Phase 2)
│   ├── session/
│   │   ├── SessionDetail.tsx        # 세션 상세 뷰
│   │   └── MessageTimeline.tsx      # 메시지 타임라인
│   └── ui/                          # 공통 UI 컴포넌트
│       ├── Card.tsx
│       ├── Table.tsx
│       ├── Badge.tsx
│       ├── EmptyState.tsx
│       └── ErrorBanner.tsx
├── lib/
│   ├── data/
│   │   ├── reader.ts               # opencode storage 파일 읽기 ✅
│   │   ├── parser.ts               # JSON 파싱 & 타입 변환 ✅
│   │   └── aggregator.ts           # 데이터 집계 로직
│   ├── types.ts                    # 타입 정의 ✅
│   ├── constants.ts                # 에이전트/모델/프로바이더 메타데이터 ✅
│   └── utils.ts                    # 포맷팅 유틸 (비용, 토큰, 시간)
├── public/
│   └── agents/                     # 에이전트 아바타 이미지 (Phase 2)
├── PLAN.md
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 10. 에이전트별 프로바이더 매핑 (constants.ts)

```typescript
export const PROVIDER_MAP = {
  'amazon-bedrock': {
    name: 'Claude Code (Bedrock)',
    color: '#F97316',
    icon: '🪨',
  },
  'openai': {
    name: 'Codex (OpenAI)',
    color: '#10B981',
    icon: '🧠',
  },
  'google': {
    name: 'Antigravity (Google)',
    color: '#8B5CF6',
    icon: '🚀',
  },
  'anthropic': {
    name: 'Anthropic (Direct)',
    color: '#EC4899',
    icon: '💬',
  },
} as const;

export const AGENT_META = {
  sisyphus:    { emoji: '🪨', label: 'Sisyphus',    role: 'Orchestrator' },
  hephaestus:  { emoji: '🔨', label: 'Hephaestus',  role: 'Builder' },
  oracle:      { emoji: '🔮', label: 'Oracle',       role: 'Advisor' },
  librarian:   { emoji: '📚', label: 'Librarian',    role: 'Researcher' },
  explore:     { emoji: '🔍', label: 'Explorer',     role: 'Scout' },
  prometheus:  { emoji: '🔥', label: 'Prometheus',   role: 'Planner' },
  metis:       { emoji: '🧩', label: 'Metis',        role: 'Analyst' },
  momus:       { emoji: '🎭', label: 'Momus',        role: 'Reviewer' },
  atlas:       { emoji: '🌍', label: 'Atlas',        role: 'Carrier' },
  'multimodal-looker': { emoji: '👁️', label: 'Looker', role: 'Vision' },
} as const;
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
  totalCost: number;
  messageCount: number;
  agents: Record<string, { cost: number; messages: number }>;
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
  messageCount: number;
  avgCostPerMessage: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokensReasoning: number;
  cacheHitRate: number;        // Σ(cache.read) / (Σ(cache.read) + Σ(input))
  avgResponseTime: number;     // completed가 있는 메시지만 대상
  models: string[];            // 사용된 모델 목록
  providers: string[];         // 사용된 프로바이더 목록
}

// 프로바이더별 집계
interface ProviderSummary {
  provider: string;
  totalCost: number;
  totalMessages: number;
  models: Record<string, { cost: number; messages: number; tokens: number }>;
}

// 대시보드 전체 데이터
interface DashboardData {
  sessions: SessionSummary[];
  agents: AgentSummary[];
  providers: ProviderSummary[];
  totals: {
    cost: number;
    messages: number;
    sessions: number;
    tokens: { input; output; reasoning; cacheRead; cacheWrite; total };
    todayCost: number;
    weekCost: number;
    monthCost: number;
  };
  timeline: TimelineEntry[];    // 히트맵용 시간대별 데이터
}

// 타임라인 항목 (히트맵용)
interface TimelineEntry {
  date: string;   // 'YYYY-MM-DD'
  hour: number;   // 0-23
  cost: number;
  messages: number;
}
```

---

## 12. 시각화 세부 사양 (Phase 2)

> Phase 2에서 구현. Phase 1에서는 테이블 + Summary Cards만.

### 12.1 에이전트 버블 차트
- 원형 버블, 크기 = 비용 비율 (면적 비례)
- 각 버블에 에이전트 이모지 + 이름
- hover 시 상세 정보 tooltip (비용, 메시지 수, 캐시율)
- 부드러운 spring 애니메이션 (Framer Motion)
- 색상: 프로바이더별 파스텔 톤
- **데이터**: `AgentSummary[]` → `{ name, value: totalCost, emoji, provider }`

### 12.2 비용 트리맵
- Level 1: 프로바이더 (Bedrock / OpenAI / Google / Anthropic)
- Level 2: 모델
- Level 3: 에이전트
- 파스텔 색상 팔레트, 둥근 모서리
- Recharts `<Treemap>` 사용
- **데이터**: `TreemapNode[]` (children 중첩 구조)

### 12.3 타임라인 히트맵
- X축: 시간대 (0-23h)
- Y축: 날짜 (최근 30일)
- 셀 색상 강도 = 해당 시간대 비용
- GitHub contributions 스타일, 둥근 셀
- **데이터**: `TimelineEntry[]`
- **집계 단위**: 시간(hour) 단위

### 12.4 토큰 플로우
- 에이전트별 input/output 토큰 비율 Stacked Bar Chart
- Cache read 비율 표시 (별도 색상)
- Recharts `<BarChart>` stacked 사용
- **데이터**: `AgentSummary[]` → input/output/cacheRead per agent

### 12.5 캐시 효율 게이지
- 에이전트별 캐시 히트율 수평 게이지
- 단계별 색상: 0-30%(빨강) → 30-70%(노랑) → 70-100%(초록)
- 전체 평균 캐시율도 상단에 표시
- **데이터**: `AgentSummary[].cacheHitRate`

---

## 13. 구현 순서 (MVP 단계별)

### Phase 1 — Core Dashboard (MVP)

> 목표: 실제 데이터로 비용/사용량을 한눈에 파악할 수 있는 기본 대시보드

| Step | 항목 | 설명 |
|---|---|---|
| ~~1~~ | ~~프로젝트 초기화~~ | ~~Next.js + Tailwind + TypeScript~~ ✅ |
| ~~2~~ | ~~타입 정의~~ | ~~types.ts, constants.ts~~ ✅ |
| ~~3~~ | ~~데이터 리더~~ | ~~reader.ts, parser.ts~~ ✅ |
| 4 | 데이터 집계 | aggregator.ts — 섹션 4 공식 기반 |
| 5 | 유틸리티 | utils.ts — 비용/토큰/시간 포맷팅 |
| 6 | 레이아웃 & 글로벌 스타일 | app/layout.tsx, globals.css, 다크모드 기본 |
| 7 | Summary Cards | 상단 요약 카드 4개 + 기간 탭 |
| 8 | Agent Table | 에이전트별 상세 테이블 (정렬 가능) |
| 9 | Provider Breakdown | 프로바이더별 비용 카드 + 도넛 차트 |
| 10 | Session List | 최근 세션 목록 + 클릭 드릴다운 |
| 11 | Session Detail | /sessions/[id] 세션 상세 페이지 |
| 12 | 에러/빈 상태 | EmptyState, ErrorBanner, loading.tsx |
| 13 | Polish | 반응형, 미세 조정, 포맷팅 |

### Phase 2 — Visualizations & Delight

> 목표: 시각적으로 풍부한 분석 도구

| Step | 항목 | 설명 |
|---|---|---|
| 14 | Visualization Toggle | on/off 상태 관리 (localStorage 저장) |
| 15 | Agent Bubbles | 에이전트 버블 차트 + Framer Motion |
| 16 | Cost Treemap | 프로바이더 > 모델 > 에이전트 트리맵 |
| 17 | Usage Heatmap | GitHub-style 타임라인 히트맵 |
| 18 | Token Flow | 토큰 input/output Stacked Bar |
| 19 | Cache Gauge | 캐시 효율 게이지 |
| 20 | 프로젝트 필터 | 프로젝트별 필터링 드롭다운 |
| 21 | Final Polish | 애니메이션 미세조정, 성능 최적화 |

---

## 14. 디자인 톤

- **베이스**: 다크 모드 (slate-900 배경)
- **카드**: slate-800 배경, subtle border (slate-700)
- **액센트**: 프로바이더별 색상 (오렌지/에메랄드/바이올렛/핑크)
- **시각화**: 파스텔 톤 + 부드러운 그라데이션
- **폰트**: Inter (sans), JetBrains Mono (숫자/코드)
- **수치 표시**: 비용 `$0.15`, 토큰 `22.9K`, 시간 `12.3s`
- **귀여운 요소**: 둥근 모서리(rounded-xl), 이모지, 부드러운 그림자
- **전체 무드**: "개발자 친화적이면서 따뜻한" — 차갑지 않은 다크 테마
