"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AGENT_META, PROVIDER_MAP } from "@/lib/constants";
import { formatCost } from "@/lib/utils";

interface AgentBreakdownDatum {
  agent: string;
  cost: number;
  provider: string;
}

interface AgentBreakdownChartProps {
  data: AgentBreakdownDatum[];
}

export function AgentBreakdownChart({ data }: AgentBreakdownChartProps) {
  const chartData = data
    .filter((entry) => entry.cost > 0)
    .map((entry) => ({
      name: `${AGENT_META[entry.agent]?.emoji ?? "❓"} ${AGENT_META[entry.agent]?.label ?? entry.agent}`,
      value: entry.cost,
      color: PROVIDER_MAP[entry.provider]?.color ?? "#6B7280",
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
        No cost data
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={104}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCost(value)}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(30, 41, 59, 0.6)",
              borderRadius: "0.75rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            itemStyle={{ color: "#e2e8f0" }}
            labelStyle={{ color: "#94a3b8" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
