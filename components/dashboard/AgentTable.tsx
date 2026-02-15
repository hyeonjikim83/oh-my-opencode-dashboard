"use client";

import { useMemo, useState } from "react";
import { AGENT_META } from "@/lib/constants";
import type { AgentSummary, Period } from "@/lib/types";
import {
  formatCost,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTokens,
} from "@/lib/utils";

type SortKey =
  | "agent"
  | "messageCount"
  | "totalCost"
  | "avgCostPerMessage"
  | "tokens"
  | "cacheHitRate"
  | "avgResponseTime";

interface AgentTableProps {
  agents: AgentSummary[];
  period: Period;
}

interface EffectiveValues {
  messageCount: number;
  billingCost: number;
  tokensIn: number;
  tokensOut: number;
  cacheHitRate: number;
  avgCostPerMessage: number;
}

function getEffectiveValues(agent: AgentSummary, period: Period): EffectiveValues {
  if (period === "all") {
    return {
      messageCount: agent.messageCount,
      billingCost: agent.billingCost,
      tokensIn: agent.totalTokensIn,
      tokensOut: agent.totalTokensOut,
      cacheHitRate: agent.cacheHitRate,
      avgCostPerMessage: agent.avgCostPerMessage,
    };
  }
  const p = agent.periods[period];
  const totalCacheable = p.cacheRead + p.tokensIn;
  return {
    messageCount: p.messages,
    billingCost: p.billingCost,
    tokensIn: p.tokensIn,
    tokensOut: p.tokensOut,
    cacheHitRate: totalCacheable > 0 ? p.cacheRead / totalCacheable : 0,
    avgCostPerMessage: p.messages > 0 ? p.billingCost / p.messages : 0,
  };
}

function getSortableValue(agent: AgentSummary, key: SortKey, period: Period): number | string {
  if (key === "agent") return agent.agent;
  const eff = getEffectiveValues(agent, period);
  if (key === "messageCount") return eff.messageCount;
  if (key === "totalCost") return eff.billingCost;
  if (key === "avgCostPerMessage") return agent.hasBillingProvider ? eff.avgCostPerMessage : -1;
  if (key === "tokens") return eff.tokensIn + eff.tokensOut;
  if (key === "cacheHitRate") return eff.cacheHitRate;
  return agent.avgResponseTime;
}

export function AgentTable({ agents, period }: AgentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalCost");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const anyHasBilling = agents.some((a) => a.hasBillingProvider);

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      if (a.agent === "unknown" && b.agent !== "unknown") return 1;
      if (b.agent === "unknown" && a.agent !== "unknown") return -1;

      const aValue = getSortableValue(a, sortKey, period);
      const bValue = getSortableValue(b, sortKey, period);
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDir === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aNumber = Number(aValue);
      const bNumber = Number(bValue);
      return sortDir === "asc" ? aNumber - bNumber : bNumber - aNumber;
    });
  }, [agents, sortDir, sortKey, period]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  };

  const sortIndicator = (key: SortKey) => {
    if (key !== sortKey) return "";
    return sortDir === "desc" ? " ↓" : " ↑";
  };

  return (
    <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Agent Usage</h2>
        <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
          {agents.length} agents
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("agent")} className="cursor-pointer transition-colors hover:text-slate-300">
                  Agent{sortIndicator("agent")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("messageCount")} className="cursor-pointer transition-colors hover:text-slate-300">
                  Messages{sortIndicator("messageCount")}
                </button>
              </th>
              {anyHasBilling && (
                <>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => onSort("totalCost")} className="cursor-pointer transition-colors hover:text-slate-300">
                      Cost{sortIndicator("totalCost")}
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSort("avgCostPerMessage")}
                      className="cursor-pointer transition-colors hover:text-slate-300"
                    >
                      Avg Cost{sortIndicator("avgCostPerMessage")}
                    </button>
                  </th>
                </>
              )}
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("tokens")} className="cursor-pointer transition-colors hover:text-slate-300">
                  Tokens In/Out{sortIndicator("tokens")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("cacheHitRate")}
                  className="cursor-pointer transition-colors hover:text-slate-300"
                >
                  Cache Hit Rate{sortIndicator("cacheHitRate")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("avgResponseTime")}
                  className="cursor-pointer transition-colors hover:text-slate-300"
                >
                  Avg Response Time{sortIndicator("avgResponseTime")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAgents.map((agent, index) => {
              const meta = AGENT_META[agent.agent] ?? {
                emoji: "?",
                label: agent.agent,
                role: "Unknown",
              };
              const eff = getEffectiveValues(agent, period);

              return (
                <tr
                  key={agent.agent}
                  className={`border-b border-slate-800/30 transition-colors ${
                    agent.agent === "unknown"
                      ? "text-slate-500"
                      : "text-slate-300 hover:bg-slate-800/30"
                  } ${index % 2 === 1 ? "bg-slate-900/40" : ""}`}
                >
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-sm ring-1 ring-white/5">
                        {meta.emoji}
                      </span>
                      <div>
                        <p className="font-medium text-slate-100">{meta.label}</p>
                        <p className="text-[11px] text-slate-500">{meta.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-slate-300">{formatNumber(eff.messageCount)}</td>
                  {anyHasBilling && (
                    <>
                      <td className="px-3 py-3.5 font-mono font-medium text-slate-100">
                        {agent.hasBillingProvider ? formatCost(eff.billingCost) : "-"}
                      </td>
                      <td className="px-3 py-3.5 font-mono text-slate-400">
                        {agent.hasBillingProvider ? formatCost(eff.avgCostPerMessage) : "-"}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3.5 font-mono text-slate-400">
                    {formatTokens(eff.tokensIn)} / {formatTokens(eff.tokensOut)}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(eff.cacheHitRate * 100, 100)}%`,
                            backgroundColor:
                              eff.cacheHitRate >= 0.7
                                ? "#22c55e"
                                : eff.cacheHitRate >= 0.3
                                  ? "#eab308"
                                  : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="font-mono text-slate-400">{formatPercent(eff.cacheHitRate)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-slate-400">{formatDuration(agent.avgResponseTime)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
