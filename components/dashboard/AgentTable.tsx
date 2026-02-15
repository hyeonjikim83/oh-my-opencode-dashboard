"use client";

import { useMemo, useState } from "react";
import { AGENT_META } from "@/lib/constants";
import type { AgentSummary } from "@/lib/types";
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
}

function getSortableValue(agent: AgentSummary, key: SortKey): number | string {
  if (key === "agent") return agent.agent;
  if (key === "messageCount") return agent.messageCount;
  if (key === "totalCost") return agent.billingCost;
  if (key === "avgCostPerMessage") return agent.hasBillingProvider ? agent.avgCostPerMessage : -1;
  if (key === "tokens") return agent.totalTokensIn + agent.totalTokensOut;
  if (key === "cacheHitRate") return agent.cacheHitRate;
  return agent.avgResponseTime;
}

export function AgentTable({ agents }: AgentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalCost");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const anyHasBilling = agents.some((a) => a.hasBillingProvider);

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      if (a.agent === "unknown" && b.agent !== "unknown") return 1;
      if (b.agent === "unknown" && a.agent !== "unknown") return -1;

      const aValue = getSortableValue(a, sortKey);
      const bValue = getSortableValue(b, sortKey);
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDir === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aNumber = Number(aValue);
      const bNumber = Number(bValue);
      return sortDir === "asc" ? aNumber - bNumber : bNumber - aNumber;
    });
  }, [agents, sortDir, sortKey]);

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
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Agent Usage</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("agent")} className="cursor-pointer">
                  Agent{sortIndicator("agent")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("messageCount")} className="cursor-pointer">
                  Messages{sortIndicator("messageCount")}
                </button>
              </th>
              {anyHasBilling && (
                <>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => onSort("totalCost")} className="cursor-pointer">
                      Cost{sortIndicator("totalCost")}
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSort("avgCostPerMessage")}
                      className="cursor-pointer"
                    >
                      Avg Cost{sortIndicator("avgCostPerMessage")}
                    </button>
                  </th>
                </>
              )}
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("tokens")} className="cursor-pointer">
                  Tokens In/Out{sortIndicator("tokens")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("cacheHitRate")}
                  className="cursor-pointer"
                >
                  Cache Hit Rate{sortIndicator("cacheHitRate")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("avgResponseTime")}
                  className="cursor-pointer"
                >
                  Avg Response Time{sortIndicator("avgResponseTime")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedAgents.map((agent) => {
              const meta = AGENT_META[agent.agent] ?? {
                emoji: "❓",
                label: agent.agent,
                role: "Unknown",
              };

              return (
                <tr
                  key={agent.agent}
                  className={agent.agent === "unknown" ? "text-slate-500" : "text-slate-300 hover:bg-slate-800/50"}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span>{meta.emoji}</span>
                      <div>
                        <p className="text-slate-100">{meta.label}</p>
                        <p className="text-xs text-slate-500">{meta.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono">{formatNumber(agent.messageCount)}</td>
                  {anyHasBilling && (
                    <>
                      <td className="px-3 py-3 font-mono text-slate-100">
                        {agent.hasBillingProvider ? formatCost(agent.billingCost) : "-"}
                      </td>
                      <td className="px-3 py-3 font-mono">
                        {agent.hasBillingProvider ? formatCost(agent.avgCostPerMessage) : "-"}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 font-mono">
                    {formatTokens(agent.totalTokensIn)} / {formatTokens(agent.totalTokensOut)}
                  </td>
                  <td className="px-3 py-3 font-mono">{formatPercent(agent.cacheHitRate)}</td>
                  <td className="px-3 py-3 font-mono">{formatDuration(agent.avgResponseTime)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
