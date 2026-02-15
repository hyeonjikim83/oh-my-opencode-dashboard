"use client";

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

  return (
    <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Provider Usage</h2>
        <span className="text-[11px] text-slate-500">
          opencode sessions only
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orderedProviders.map((provider) => {
          const meta = PROVIDER_MAP[provider.provider] ?? {
            name: "Unknown Provider",
            color: "#6B7280",
            icon: "❓",
          };
          const models = Object.entries(provider.models)
            .sort((a, b) => b[1].cost - a[1].cost)
            .slice(0, 2)
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
              className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/50 bg-slate-950/50 p-3.5"
            >
              <div
                className="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
                style={{ background: `radial-gradient(ellipse at top right, ${meta.color}, transparent 70%)` }}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-300">
                    {meta.icon} {meta.name}
                  </p>
                  <span
                    className="h-2 w-2 rounded-full shadow-[0_0_6px_var(--glow)]"
                    style={{ backgroundColor: meta.color, "--glow": `${meta.color}40` } as React.CSSProperties}
                  />
                </div>

                {isBillingBased ? (
                  <p className="mt-2 font-mono text-xl font-bold text-slate-50">
                    {formatCost(provider.totalCost)}
                    <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                      {formatNumber(provider.totalMessages)} msgs
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 font-mono text-xl font-bold text-slate-50">
                    {formatNumber(provider.totalMessages)}
                    <span className="ml-1.5 text-[11px] font-normal text-slate-500">msgs</span>
                  </p>
                )}

                {weeklyLimit && (
                  <div className="mt-2.5 space-y-2">
                    {dailyLimit && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>Daily</span>
                          <span className="font-mono">
                            {formatNumber(provider.todayMessages)}/{formatNumber(dailyLimit)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden ring-1 ring-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${dailyUsagePercent}%`,
                              backgroundColor: dailyUsagePercent! > 80 ? "#EF4444" : dailyUsagePercent! > 60 ? "#F59E0B" : meta.color,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Weekly</span>
                        <span className="font-mono">
                          {formatNumber(provider.weekMessages)}/{formatNumber(weeklyLimit)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden ring-1 ring-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${weekUsagePercent}%`,
                            backgroundColor: weekUsagePercent! > 80 ? "#EF4444" : weekUsagePercent! > 60 ? "#F59E0B" : meta.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!weeklyLimit && (
                  <div className="mt-2 text-[11px] text-slate-500">
                    <span>Today {formatNumber(provider.todayMessages)} · Week {formatNumber(provider.weekMessages)}</span>
                  </div>
                )}

                <p className="mt-2 truncate text-[11px] text-slate-500">
                  {models.length > 0 ? models.join(" · ") : "No models"}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
