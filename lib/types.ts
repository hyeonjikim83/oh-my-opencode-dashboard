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
}

export interface ProviderSummary {
  provider: string;
  totalCost: number;
  totalMessages: number;
  models: Record<string, { cost: number; messages: number; tokens: number }>;
  todayMessages: number;
  weekMessages: number;
  todayTokens: number;
  weekTokens: number;
}

export interface DashboardData {
  sessions: SessionSummary[];
  agents: AgentSummary[];
  providers: ProviderSummary[];
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
