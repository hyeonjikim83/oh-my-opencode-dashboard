"use client";

import { AGENT_META } from "@/lib/constants";
import type { AgentSummary } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

interface CacheGaugeProps {
  agents: AgentSummary[];
}

function gaugeColor(rate: number): string {
  if (rate < 0.3) return "#f87171";
  if (rate < 0.7) return "#fbbf24";
  return "#34d399";
}

export function CacheGauge({ agents }: CacheGaugeProps) {
  const sorted = agents
    .filter((a) => a.agent !== "unknown" && (a.totalTokensIn + a.totalCacheRead) > 0)
    .sort((a, b) => b.cacheHitRate - a.cacheHitRate);

  const totalCacheRead = sorted.reduce((s, a) => s + a.totalCacheRead, 0);
  const totalInput = sorted.reduce((s, a) => s + a.totalTokensIn, 0);
  const avgRate = (totalCacheRead + totalInput) > 0
    ? totalCacheRead / (totalCacheRead + totalInput)
    : 0;

  if (sorted.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Cache Efficiency</h2>
        <div className="mt-4 flex h-48 items-center justify-center text-sm text-slate-500">
          No cache data yet
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Cache Efficiency</h2>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold" style={{ color: gaugeColor(avgRate) }}>
          {formatPercent(avgRate)}
        </span>
        <span className="text-xs text-slate-500">average across agents</span>
      </div>

      <div className="mt-5 space-y-3">
        {sorted.map((agent) => {
          const meta = AGENT_META[agent.agent] ?? { emoji: "?", label: agent.agent };
          const pct = agent.cacheHitRate * 100;
          const color = gaugeColor(agent.cacheHitRate);

          return (
            <div key={agent.agent}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{meta.emoji} {meta.label}</span>
                <span className="font-mono" style={{ color }}>{formatPercent(agent.cacheHitRate)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-400" />0-30%</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />30-70%</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />70-100%</span>
      </div>
    </section>
  );
}
