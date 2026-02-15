"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AGENT_META } from "@/lib/constants";
import type { AgentSummary } from "@/lib/types";
import { formatTokens } from "@/lib/utils";

interface TokenFlowProps {
  agents: AgentSummary[];
}

export function TokenFlow({ agents }: TokenFlowProps) {
  const data = agents
    .filter((a) => a.agent !== "unknown" && (a.totalTokensIn + a.totalTokensOut + a.totalCacheRead) > 0)
    .slice(0, 10)
    .map((a) => ({
      name: AGENT_META[a.agent]?.label ?? a.agent,
      input: a.totalTokensIn,
      output: a.totalTokensOut,
      cache: a.totalCacheRead,
    }));

  if (data.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Token Flow</h2>
        <div className="mt-4 flex h-48 items-center justify-center text-sm text-slate-500">
          No token data yet
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Token Flow</h2>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-400" />Input</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />Output</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />Cache Read</span>
      </div>
      <div className="mt-4" style={{ height: Math.max(200, data.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatTokens(v)}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={90}
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatTokens(value), name]}
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.75rem",
                color: "#e2e8f0",
                fontSize: 12,
              }}
            />
            <Bar dataKey="input" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
            <Bar dataKey="output" stackId="a" fill="#34d399" />
            <Bar dataKey="cache" stackId="a" fill="#fbbf24" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
