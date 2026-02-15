"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { PROVIDER_MAP, isProviderBilling } from "@/lib/constants";
import type { ProviderSummary } from "@/lib/types";
import { formatCost, formatNumber } from "@/lib/utils";

interface CostTreemapProps {
  providers: ProviderSummary[];
}

interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
  color?: string;
}

function CustomContent(props: Record<string, unknown>) {
  const { x, y, width, height, name, depth, color } = props as {
    x: number; y: number; width: number; height: number;
    name: string; depth: number; color?: string;
  };

  if (width < 30 || height < 20) return null;

  const fill = depth === 1 ? (color ?? "#6B7280") : `${color ?? "#6B7280"}80`;
  const fontSize = width < 60 ? 9 : 11;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={fill}
        stroke="#0f172a"
        strokeWidth={2}
        style={{ opacity: depth === 1 ? 0.85 : 0.6 }}
      />
      {width > 40 && height > 24 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f1f5f9"
          fontSize={fontSize}
          fontWeight={depth === 1 ? 600 : 400}
        >
          {String(name).length > (width / fontSize) * 1.5
            ? `${String(name).slice(0, Math.floor((width / fontSize) * 1.2))}...`
            : name}
        </text>
      )}
    </g>
  );
}

export function CostTreemap({ providers }: CostTreemapProps) {
  const billingProviders = providers.filter(
    (p) => isProviderBilling(p.provider) && p.totalCost > 0
  );

  if (billingProviders.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Cost Treemap</h2>
        <div className="mt-4 flex h-48 items-center justify-center text-sm text-slate-500">
          No billing provider cost data
        </div>
      </section>
    );
  }

  const treeData: TreeNode[] = billingProviders.map((p) => {
    const meta = PROVIDER_MAP[p.provider];
    const color = meta?.color ?? "#6B7280";
    const children = Object.entries(p.models)
      .filter(([, m]) => m.cost > 0)
      .map(([modelId, m]) => ({
        name: modelId,
        value: m.cost,
        color,
      }));

    return {
      name: meta?.name ?? p.provider,
      children: children.length > 0 ? children : [{ name: meta?.name ?? p.provider, value: p.totalCost, color }],
      color,
    };
  });

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Cost Treemap</h2>
      <p className="mt-1 text-xs text-slate-500">Provider &gt; Model cost breakdown (billing providers only)</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treeData}
            dataKey="value"
            nameKey="name"
            aspectRatio={4 / 3}
            content={<CustomContent />}
          >
            <Tooltip
              formatter={(value: number) => formatCost(value)}
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.75rem",
                color: "#e2e8f0",
                fontSize: 12,
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
        {billingProviders.map((p) => {
          const meta = PROVIDER_MAP[p.provider];
          return (
            <span key={p.provider} className="flex items-center gap-1 text-slate-400">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: meta?.color ?? "#6B7280" }} />
              {meta?.name ?? p.provider} {formatCost(p.totalCost)} ({formatNumber(p.totalMessages)} msgs)
            </span>
          );
        })}
      </div>
    </section>
  );
}
