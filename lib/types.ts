export interface RawSession {
  id: string;
  slug: string;
  version: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  time: {
    created: number;
    updated: number;
  };
  summary?: {
    additions: number;
    deletions: number;
    files: number;
  };
}

export interface TokenBreakdown {
  total: number;
  input: number;
  output: number;
  reasoning: number;
  cache: {
    read: number;
    write: number;
  };
}

export interface RawMessage {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  time: {
    created: number;
    completed?: number;
  };
  parentID?: string;
  modelID?: string;
  providerID?: string;
  mode?: string;
  agent?: string;
  model?: {
    providerID?: string;
    modelID?: string;
  };
  path?: {
    cwd: string;
    root: string;
  };
  cost?: number;
  tokens?: TokenBreakdown;
  variant?: string;
  finish?: string;
}

export interface SessionSummary {
  id: string;
  slug: string;
  title: string;
  directory: string;
  duration: number;
  createdAt: number;
  updatedAt: number;
  totalCost: number;
  billingCost: number;
  messageCount: number;
  parentID?: string;
  children: SessionSummary[];
  agents: Record<string, {
    cost: number;
    messages: number;
    lastActiveAt: number;
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

export type Period = "today" | "week" | "month" | "all";

export interface PeriodMetrics {
  messages: number;
  billingCost: number;
  totalCost: number;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  cacheRead: number;
}

export interface AgentSummary {
  agent: string;
  totalCost: number;
  billingCost: number;
  messageCount: number;
  avgCostPerMessage: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokensReasoning: number;
  totalCacheRead: number;
  cacheHitRate: number;
  avgResponseTime: number;
  models: string[];
  providers: string[];
  hasBillingProvider: boolean;
  periods: Record<Exclude<Period, "all">, PeriodMetrics>;
}

export interface ProviderSummary {
  provider: string;
  totalCost: number;
  totalMessages: number;
  models: Record<string, { cost: number; messages: number; tokens: number }>;
  todayMessages: number;
  todayCost: number;
  todayTokens: number;
  weekMessages: number;
  weekCost: number;
  weekTokens: number;
  monthMessages: number;
  monthCost: number;
  monthTokens: number;
  fiveHourMessages: number;
  fiveHourCost: number;
  fiveHourTokens: number;
}

export interface DashboardData {
  sessions: SessionSummary[];
  agents: AgentSummary[];
  providers: ProviderSummary[];
  codexUsage?: CodexUsageSnapshot;
  totals: {
    cost: number;
    billingCost: number;
    messages: number;
    sessions: number;
    tokens: {
      input: number;
      output: number;
      reasoning: number;
      cacheRead: number;
      cacheWrite: number;
      total: number;
    };
    todayCost: number;
    weekCost: number;
    monthCost: number;
    todayBillingCost: number;
    weekBillingCost: number;
    monthBillingCost: number;
    fiveHourCost: number;
    fiveHourBillingCost: number;
    fiveHourSubscriptionCost: number;
    periods: Record<Exclude<Period, "all">, {
      billingCost: number;
      messages: number;
      tokens: { input: number; output: number; total: number };
    }>;
  };
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  date: string;
  hour: number;
  cost: number;
  messages: number;
}

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  color?: string;
}

export interface CodexRateLimitWindow {
  /** 0–100 (not 0–1) */
  usedPercent: number;
  /** e.g. 18 000 = 5 h, 604 800 = 1 w */
  windowSeconds: number;
  resetAfterSeconds: number;
  /** Unix epoch seconds (not ms) */
  resetAt: number;
}

export interface CodexAdditionalRateLimit {
  limitName: string;
  allowed: boolean;
  limitReached: boolean;
  primaryWindow?: CodexRateLimitWindow;
  secondaryWindow?: CodexRateLimitWindow;
}

export interface CodexUsageSnapshot {
  /** "pro" | "plus" | "free" — raw string from OpenAI */
  planType: string;
  allowed: boolean;
  limitReached: boolean;
  /** Short rolling window — typically 5 h */
  primaryWindow?: CodexRateLimitWindow;
  /** Long rolling window — typically 1 w */
  secondaryWindow?: CodexRateLimitWindow;
  additionalLimits: CodexAdditionalRateLimit[];
  fetchedAt: number;
}
