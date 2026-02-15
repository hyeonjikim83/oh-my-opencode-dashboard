import { readFileSync } from "fs";
import { join } from "path";
import type {
  CodexAdditionalRateLimit,
  CodexRateLimitWindow,
  CodexUsageSnapshot,
} from "@/lib/types";

const CODEX_HOME =
  process.env.CODEX_HOME || join(process.env.HOME ?? "", ".codex");
const CHATGPT_BASE_URL =
  process.env.CODEX_CHATGPT_BASE_URL ?? "https://chatgpt.com/backend-api";

interface CodexAuthJson {
  tokens?: {
    access_token?: string;
  };
}

interface RawWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
}

interface RawRateLimit {
  allowed: boolean;
  limit_reached: boolean;
  primary_window?: RawWindow | null;
  secondary_window?: RawWindow | null;
}

interface RawAdditional {
  limit_name: string;
  rate_limit: RawRateLimit;
}

interface RawPayload {
  plan_type: string;
  rate_limit?: RawRateLimit | null;
  additional_rate_limits?: RawAdditional[] | null;
}

function readAccessToken(): string | undefined {
  try {
    const raw = readFileSync(join(CODEX_HOME, "auth.json"), "utf-8");
    const auth: CodexAuthJson = JSON.parse(raw);
    return auth.tokens?.access_token || undefined;
  } catch {
    return undefined;
  }
}

function mapWindow(raw?: RawWindow | null): CodexRateLimitWindow | undefined {
  if (!raw) return undefined;
  return {
    usedPercent: raw.used_percent,
    windowSeconds: raw.limit_window_seconds,
    resetAfterSeconds: raw.reset_after_seconds,
    resetAt: raw.reset_at,
  };
}

function mapAdditional(raw: RawAdditional[]): CodexAdditionalRateLimit[] {
  return raw.map((a) => ({
    limitName: a.limit_name,
    allowed: a.rate_limit.allowed,
    limitReached: a.rate_limit.limit_reached,
    primaryWindow: mapWindow(a.rate_limit.primary_window),
    secondaryWindow: mapWindow(a.rate_limit.secondary_window),
  }));
}

export async function fetchCodexUsage(): Promise<CodexUsageSnapshot | undefined> {
  const token = readAccessToken();
  if (!token) return undefined;

  try {
    const url = `${CHATGPT_BASE_URL}/wham/usage`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return undefined;

    const payload: RawPayload = await res.json();
    const rl = payload.rate_limit;

    return {
      planType: payload.plan_type ?? "unknown",
      allowed: rl?.allowed ?? true,
      limitReached: rl?.limit_reached ?? false,
      primaryWindow: mapWindow(rl?.primary_window),
      secondaryWindow: mapWindow(rl?.secondary_window),
      additionalLimits: mapAdditional(payload.additional_rate_limits ?? []),
      fetchedAt: Date.now(),
    };
  } catch {
    return undefined;
  }
}
