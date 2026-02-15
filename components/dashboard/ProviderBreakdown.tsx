"use client";

import { motion } from "framer-motion";
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
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
      className="panel-frame panel-frame-hover relative overflow-hidden rounded-2xl p-6"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl p-px [background:linear-gradient(150deg,rgba(34,211,238,0.45),transparent_35%,rgba(251,191,36,0.36))] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:xor]" />
      <h2 className="text-lg font-semibold tracking-tight text-slate-50">Provider Usage</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-4">
          {orderedProviders.map((provider, index) => {
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
              <motion.article
                key={provider.provider}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                whileHover={{ y: -3 }}
                className="group relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/45 p-4 transition duration-300 hover:border-cyan-200/40 hover:shadow-[0_12px_28px_rgba(34,211,238,0.14)]"
              >
                <div className="pointer-events-none absolute -right-8 top-0 h-20 w-20 rounded-full bg-cyan-200/20 blur-2xl transition duration-300 group-hover:bg-cyan-200/30" />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-200">
                    {meta.icon} {meta.name}
                  </p>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                </div>

                {isBillingBased ? (
                  <>
                    <p className="mt-3 font-mono text-2xl font-semibold text-slate-100">
                      {formatCost(provider.totalCost)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatNumber(provider.totalMessages)} messages total
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-mono text-2xl font-semibold text-slate-100">
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
                        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-300/90">
                          <span>Daily Usage</span>
                          <span>
                            {formatNumber(provider.todayMessages)} / {formatNumber(dailyLimit)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800/90">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${dailyUsagePercent}%`,
                              backgroundColor:
                                dailyUsagePercent! > 80
                                  ? "#EF4444"
                                  : dailyUsagePercent! > 60
                                    ? "#F59E0B"
                                    : meta.color,
                              boxShadow: `0 0 14px ${meta.color}`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTokens(provider.todayTokens)} tokens today
                        </p>
                      </div>
                    )}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-300/90">
                        <span>Weekly Usage</span>
                        <span>
                          {formatNumber(provider.weekMessages)} / {formatNumber(weeklyLimit)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800/90">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${weekUsagePercent}%`,
                            backgroundColor:
                              weekUsagePercent! > 80
                                ? "#EF4444"
                                : weekUsagePercent! > 60
                                  ? "#F59E0B"
                                  : meta.color,
                            boxShadow: `0 0 14px ${meta.color}`,
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
                  <div className="mt-4">
                    <p className="text-xs text-slate-400">
                      Week: {formatNumber(provider.weekMessages)} msgs · {formatTokens(provider.weekTokens)} tokens
                    </p>
                    <p className="text-xs text-slate-500">
                      Today: {formatNumber(provider.todayMessages)} msgs · {formatTokens(provider.todayTokens)} tokens
                    </p>
                  </div>
                )}

                <p className="mt-3 truncate text-xs text-slate-400">
                  {models.length > 0 ? models.join(" · ") : "No model usage yet"}
                </p>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
          className="relative rounded-xl border border-slate-700/60 bg-slate-950/40 p-4"
        >
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_70%_10%,rgba(34,211,238,0.2),transparent_62%)]" />
          <p className="relative text-sm text-slate-300">Cost Share</p>
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
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCost(value)}
                    contentStyle={{
                      background: "#0a1328",
                      border: "1px solid rgba(125, 240, 255, 0.45)",
                      borderRadius: "0.75rem",
                      color: "#e5edf9",
                      boxShadow: "0 10px 25px rgba(1, 6, 20, 0.38)",
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
        </motion.div>
      </div>
    </motion.section>
  );
}
