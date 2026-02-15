"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PROVIDER_MAP } from "@/lib/constants";
import type { ProviderSummary } from "@/lib/types";
import { formatCost, formatNumber, formatTokens } from "@/lib/utils";

interface ProviderBreakdownProps {
  providers: ProviderSummary[];
}

export function ProviderBreakdown({ providers }: ProviderBreakdownProps) {
  const orderedProviders = providers.filter(
    (provider) => provider.totalCost > 0 || provider.totalMessages > 0
  );

  const chartData = orderedProviders
    .filter((provider) => provider.totalCost > 0)
    .map((provider) => ({
      name: PROVIDER_MAP[provider.provider]?.name ?? provider.provider,
      value: provider.totalCost,
      color: PROVIDER_MAP[provider.provider]?.color ?? "#6B7280",
    }));

  return (
    <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-slate-100">Provider Usage</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-4">
          {orderedProviders.map((provider) => {
            const meta = PROVIDER_MAP[provider.provider] ?? {
              name: "Unknown Provider",
              color: "#6B7280",
              icon: "❓",
            };
            const models = Object.entries(provider.models)
              .sort((a, b) => b[1].cost - a[1].cost)
              .slice(0, 3)
              .map(([model]) => model);

            const weeklyLimit = meta.weeklyMessageLimit;
            const dailyLimit = meta.dailyMessageLimit;
            const isBillingBased = meta.billingType === "billing";
            const weekUsagePercent = weeklyLimit 
              ? Math.min((provider.weekMessages / weeklyLimit) * 100, 100)
              : null;
            const dailyUsagePercent = dailyLimit
              ? Math.min((provider.todayMessages / dailyLimit) * 100, 100)
              : null;

            return (
              <article
                key={provider.provider}
                className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/50 bg-slate-950/50 p-4"
              >
                <div
                  className="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
                  style={{ background: `radial-gradient(ellipse at top right, ${meta.color}, transparent 70%)` }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-300">
                      {meta.icon} {meta.name}
                    </p>
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_var(--glow)]"
                      style={{ backgroundColor: meta.color, "--glow": `${meta.color}40` } as React.CSSProperties}
                    />
                  </div>
                  
                  {isBillingBased ? (
                    <>
                      <p className="mt-3 font-mono text-2xl font-bold text-slate-50">
                        {formatCost(provider.totalCost)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatNumber(provider.totalMessages)} messages total
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 font-mono text-2xl font-bold text-slate-50">
                        {formatNumber(provider.totalMessages)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        messages used (account-based)
                      </p>
                    </>
                  )}

                  {weeklyLimit && (
                    <div className="mt-4 space-y-3">
                      {dailyLimit && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span>Daily Usage</span>
                            <span className="font-mono">
                              {formatNumber(provider.todayMessages)} / {formatNumber(dailyLimit)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden ring-1 ring-white/5">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${dailyUsagePercent}%`,
                                backgroundColor: dailyUsagePercent! > 80 ? "#EF4444" : dailyUsagePercent! > 60 ? "#F59E0B" : meta.color,
                                boxShadow: `0 0 8px ${dailyUsagePercent! > 80 ? "#EF444440" : dailyUsagePercent! > 60 ? "#F59E0B40" : `${meta.color}40`}`
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatTokens(provider.todayTokens)} tokens today
                          </p>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                          <span>Weekly Usage</span>
                          <span className="font-mono">
                            {formatNumber(provider.weekMessages)} / {formatNumber(weeklyLimit)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden ring-1 ring-white/5">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${weekUsagePercent}%`,
                              backgroundColor: weekUsagePercent! > 80 ? "#EF4444" : weekUsagePercent! > 60 ? "#F59E0B" : meta.color,
                              boxShadow: `0 0 8px ${weekUsagePercent! > 80 ? "#EF444440" : weekUsagePercent! > 60 ? "#F59E0B40" : `${meta.color}40`}`
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTokens(provider.weekTokens)} tokens this week
                        </p>
                      </div>
                    </div>
                  )}

                  {!weeklyLimit && (
                    <div className="mt-4 space-y-1">
                      <p className="text-xs text-slate-400">
                        Week: {formatNumber(provider.weekMessages)} msgs · {formatTokens(provider.weekTokens)} tokens
                      </p>
                      <p className="text-xs text-slate-500">
                        Today: {formatNumber(provider.todayMessages)} msgs · {formatTokens(provider.todayTokens)} tokens
                      </p>
                    </div>
                  )}

                  <p className="mt-3 truncate text-xs text-slate-500">
                    {models.length > 0 ? models.join(" · ") : "No model usage yet"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-800/50 bg-slate-950/50 p-4">
          <p className="text-sm font-medium text-slate-400">Cost Share</p>
          <div className="mt-3 h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
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
                      color: "#e2e8f0",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No provider cost data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
