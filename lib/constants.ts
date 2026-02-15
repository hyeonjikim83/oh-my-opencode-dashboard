export interface ProviderMeta {
  name: string;
  color: string;
  icon: string;
  billingType: "billing" | "account";
  weeklyMessageLimit?: number;
  dailyMessageLimit?: number;
  /** Models available through this provider (model ID → display info) */
  models?: Record<string, { name: string; free?: boolean }>;
}

export const PROVIDER_MAP: Record<string, ProviderMeta> = {
  "amazon-bedrock": {
    name: "Claude Code (Bedrock)",
    color: "#F97316",
    icon: "🪨",
    billingType: "billing",
    models: {
      "anthropic.claude-opus-4-6-v1": { name: "Claude Opus 4.6" },
      "anthropic.claude-opus-4-5-v1": { name: "Claude Opus 4.5" },
      "anthropic.claude-sonnet-4-5-v1": { name: "Claude Sonnet 4.5" },
      "anthropic.claude-sonnet-4-v1": { name: "Claude Sonnet 4" },
      "anthropic.claude-haiku-4-5-v1": { name: "Claude Haiku 4.5" },
    },
  },
  openai: {
    name: "Codex (OpenAI)",
    color: "#10B981",
    icon: "🧠",
    billingType: "billing",
    models: {
      "gpt-5.2": { name: "GPT 5.2" },
      "gpt-5.2-codex": { name: "GPT 5.2 Codex" },
      "gpt-5.1": { name: "GPT 5.1" },
      "gpt-5.1-codex": { name: "GPT 5.1 Codex" },
      "gpt-5.1-codex-max": { name: "GPT 5.1 Codex Max" },
      "gpt-5.1-codex-mini": { name: "GPT 5.1 Codex Mini" },
      "gpt-5": { name: "GPT 5" },
      "gpt-5-codex": { name: "GPT 5 Codex" },
      "gpt-5-nano": { name: "GPT 5 Nano", free: true },
    },
  },
  google: {
    name: "Antigravity (Google)",
    color: "#8B5CF6",
    icon: "🚀",
    billingType: "account",
    // Antigravity free tier: weekly refresh cycle, compute-based limits.
    // Estimates based on community reports & Google blog (Dec 2025).
    // AI Pro/Ultra get 5-hour refresh + higher limits.
    weeklyMessageLimit: 1000,
    dailyMessageLimit: 200,
    models: {
      "gemini-3-pro": { name: "Gemini 3 Pro" },
      "gemini-3-flash": { name: "Gemini 3 Flash" },
    },
  },
  anthropic: {
    name: "Anthropic (Direct)",
    color: "#EC4899",
    icon: "💬",
    billingType: "billing",
    models: {
      "claude-opus-4-6": { name: "Claude Opus 4.6" },
      "claude-opus-4-5": { name: "Claude Opus 4.5" },
      "claude-opus-4-1": { name: "Claude Opus 4.1" },
      "claude-sonnet-4-5": { name: "Claude Sonnet 4.5" },
      "claude-sonnet-4": { name: "Claude Sonnet 4" },
      "claude-haiku-4-5": { name: "Claude Haiku 4.5" },
      "claude-3-5-haiku": { name: "Claude Haiku 3.5" },
    },
  },
  opencode: {
    name: "OpenCode Zen",
    color: "#3B82F6",
    icon: "✨",
    billingType: "account",
    // Zen free models have undisclosed per-model limits.
    // These are estimates for the free-tier models.
    weeklyMessageLimit: 500,
    dailyMessageLimit: 100,
    models: {
      "gpt-5-nano": { name: "GPT 5 Nano", free: true },
      "kimi-k2.5-free": { name: "Kimi K2.5 Free", free: true },
      "minimax-m2.5-free": { name: "MiniMax M2.5 Free", free: true },
      "minimax-m2.1-free": { name: "MiniMax M2.1 Free", free: true },
      "glm-4.7-free": { name: "GLM 4.7 Free", free: true },
      "big-pickle": { name: "Big Pickle", free: true },
      "trinity-large-preview-free": { name: "Trinity Large Preview", free: true },
      "alpha-g5": { name: "Alpha G5", free: true },
      "glm-5": { name: "GLM 5" },
      "glm-4.7": { name: "GLM 4.7" },
      "glm-4.6": { name: "GLM 4.6" },
      "kimi-k2.5": { name: "Kimi K2.5" },
      "kimi-k2": { name: "Kimi K2" },
      "kimi-k2-thinking": { name: "Kimi K2 Thinking" },
      "minimax-m2.5": { name: "MiniMax M2.5" },
      "minimax-m2.1": { name: "MiniMax M2.1" },
      "qwen3-coder": { name: "Qwen3 Coder 480B" },
    },
  },
  copilot: {
    name: "GitHub Copilot",
    color: "#6366F1",
    icon: "🐙",
    billingType: "account",
    weeklyMessageLimit: 2100,
    dailyMessageLimit: 300,
    models: {
      "claude-sonnet-4": { name: "Claude Sonnet 4" },
      "gpt-4o": { name: "GPT-4o" },
      "gpt-5": { name: "GPT 5" },
    },
  },
};

/** Helper: check if a provider uses API-based billing (shows dollar costs) */
export function isProviderBilling(providerID: string): boolean {
  return (PROVIDER_MAP[providerID]?.billingType ?? "billing") === "billing";
}

export const AGENT_META: Record<
  string,
  { emoji: string; label: string; role: string }
> = {
  sisyphus: { emoji: "\u{1FAA8}", label: "Sisyphus", role: "Orchestrator" },
  hephaestus: { emoji: "\u{1F528}", label: "Hephaestus", role: "Builder" },
  oracle: { emoji: "\u{1F52E}", label: "Oracle", role: "Advisor" },
  librarian: { emoji: "\u{1F4DA}", label: "Librarian", role: "Researcher" },
  explore: { emoji: "\u{1F50D}", label: "Explorer", role: "Scout" },
  prometheus: { emoji: "\u{1F525}", label: "Prometheus", role: "Planner" },
  metis: { emoji: "\u{1F9E9}", label: "Metis", role: "Analyst" },
  momus: { emoji: "\u{1F3AD}", label: "Momus", role: "Reviewer" },
  atlas: { emoji: "\u{1F30D}", label: "Atlas", role: "Carrier" },
  "multimodal-looker": {
    emoji: "\u{1F441}\uFE0F",
    label: "Looker",
    role: "Vision",
  },
};

export const PASTEL_PALETTE = [
  "#FFB3BA",
  "#BAFFC9",
  "#BAE1FF",
  "#FFFFBA",
  "#E8BAFF",
  "#FFD9BA",
  "#BAF2FF",
  "#FFBAF2",
  "#C9FFBA",
  "#BAC9FF",
];

export const STORAGE_BASE_PATH =
  process.env.OPENCODE_STORAGE_PATH ||
  `${process.env.HOME}/.local/share/opencode/storage`;

export const DB_PATH =
  process.env.OPENCODE_DB_PATH ||
  `${process.env.HOME}/.local/share/opencode/opencode.db`;
