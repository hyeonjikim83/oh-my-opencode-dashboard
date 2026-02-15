"use client";

import { motion } from "framer-motion";
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
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="panel-frame panel-frame-hover relative overflow-hidden rounded-2xl p-6"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl p-px [background:linear-gradient(140deg,rgba(34,211,238,0.52),transparent_40%,rgba(251,191,36,0.48))] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:xor]" />
      <h2 className="text-lg font-semibold tracking-tight text-slate-50">Agent Usage</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-950/30">
        <table className="min-w-full divide-y divide-slate-700/60 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-400">
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("agent")}
                  className="cursor-pointer transition-colors hover:text-cyan-200"
                >
                  Agent{sortIndicator("agent")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("messageCount")}
                  className="cursor-pointer transition-colors hover:text-cyan-200"
                >
                  Messages{sortIndicator("messageCount")}
                </button>
              </th>
              {anyHasBilling && (
                <>
                  <th className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSort("totalCost")}
                      className="cursor-pointer transition-colors hover:text-cyan-200"
                    >
                      Cost{sortIndicator("totalCost")}
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSort("avgCostPerMessage")}
                      className="cursor-pointer transition-colors hover:text-cyan-200"
                    >
                      Avg Cost{sortIndicator("avgCostPerMessage")}
                    </button>
                  </th>
                </>
              )}
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("tokens")}
                  className="cursor-pointer transition-colors hover:text-cyan-200"
                >
                  Tokens In/Out{sortIndicator("tokens")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("cacheHitRate")}
                  className="cursor-pointer transition-colors hover:text-cyan-200"
                >
                  Cache Hit Rate{sortIndicator("cacheHitRate")}
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort("avgResponseTime")}
                  className="cursor-pointer transition-colors hover:text-cyan-200"
                >
                  Avg Response Time{sortIndicator("avgResponseTime")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedAgents.map((agent) => {
              const meta = AGENT_META[agent.agent] ?? {
                emoji: "❓",
                label: agent.agent,
                role: "Unknown",
              };

              return (
                <tr
                  key={agent.agent}
                  className={
                    agent.agent === "unknown"
                      ? "text-slate-500"
                      : "text-slate-300 transition-colors hover:bg-cyan-300/[0.07]"
                  }
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span>{meta.emoji}</span>
                      <div>
                        <p className="text-slate-100">{meta.label}</p>
                        <p className="text-xs text-slate-500/90">{meta.role}</p>
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
    </motion.section>
  );
}
