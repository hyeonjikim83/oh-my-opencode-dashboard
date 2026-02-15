"use client";

import { PROVIDER_MAP } from "@/lib/constants";
import type { CodexUsageSnapshot, Period, ProviderSummary } from "@/lib/types";
import {
  formatCost,
  formatNumber,
  formatResetCountdown,
  formatResetTime,
  formatWindowLabel,
} from "@/lib/utils";

interface ProviderBreakdownProps {
  providers: ProviderSummary[];
  codexUsage?: CodexUsageSnapshot;
  period: Period;
}

function periodMessages(p: ProviderSummary, period: Period): number {
  if (period === "today") return p.todayMessages;
  if (period === "week") return p.weekMessages;
  if (period === "month") return p.monthMessages;
  return p.totalMessages;
}

function periodCost(p: ProviderSummary, period: Period): number {
  if (period === "today") return p.todayCost;
  if (period === "week") return p.weekCost;
  if (period === "month") return p.monthCost;
  return p.totalCost;
}

function barColor(percent: number, accent: string): string {
  if (percent > 80) return "#EF4444";
  if (percent > 60) return "#F59E0B";
  return accent;
}

export function ProviderBreakdown({ providers, codexUsage, period }: ProviderBreakdownProps) {
  const orderedProviders = providers.filter(
    (provider) => periodCost(provider, period) > 0 || periodMessages(provider, period) > 0
  );

  return (
    <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Provider Usage</h2>
        <span className="text-[11px] text-slate-500">
          ● Estimated : opencode sessions only
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orderedProviders.map((provider) => {
          const meta = PROVIDER_MAP[provider.provider] ?? {
            name: "Unknown Provider",
            color: "#6B7280",
            icon: "?",
          };
          const models = Object.entries(provider.models)
            .sort((a, b) => b[1].cost - a[1].cost)
            .slice(0, 2)
            .map(([model]) => model);

          const bt = meta.billingType ?? "api";
          const isApi = bt === "api";
          const isSubscription = bt === "subscription";
          const isAccount = bt === "account";

          const hasRealCodexData = provider.provider === "openai" && codexUsage != null;

          const weeklyLimit = meta.weeklyMessageLimit;
          const dailyLimit = meta.dailyMessageLimit;
          const fiveHourLimit = meta.fiveHourCostLimit;

          const fiveHourPercent = isSubscription && fiveHourLimit
            ? Math.min((provider.fiveHourCost / fiveHourLimit) * 100, 100)
            : null;
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

                {isApi && (
                  <>
                    <p className="mt-2 font-mono text-xl font-bold text-slate-50">
                      {formatCost(periodCost(provider, period))}
                      <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                        {formatNumber(periodMessages(provider, period))} msgs
                      </span>
                    </p>
                    <div className="mt-2 text-[11px] text-slate-500">
                      <span>5h {formatCost(provider.fiveHourCost)} · All {formatNumber(provider.totalMessages)} msgs</span>
                    </div>
                  </>
                )}

                {isSubscription && (
                  <>
                    <p className="mt-2 font-mono text-xl font-bold text-slate-50">
                      {formatCost(periodCost(provider, period))}
                      <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                        {formatNumber(periodMessages(provider, period))} msgs
                      </span>
                    </p>
                    {fiveHourLimit && fiveHourPercent != null && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>5h Window</span>
                          <span className="font-mono">
                            {formatCost(provider.fiveHourCost)} / {formatCost(fiveHourLimit)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden ring-1 ring-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${fiveHourPercent}%`,
                              backgroundColor: barColor(fiveHourPercent, meta.color),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isAccount && hasRealCodexData && (
                  <CodexRealUsage
                    provider={provider}
                    codexUsage={codexUsage!}
                    accent={meta.color}
                  />
                )}

                {isAccount && !hasRealCodexData && (
                  <>
                    <p className="mt-2 font-mono text-xl font-bold text-slate-50">
                      {formatNumber(periodMessages(provider, period))}
                      <span className="ml-1.5 text-[11px] font-normal text-slate-500">msgs</span>
                    </p>
                    {weeklyLimit ? (
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
                                  backgroundColor: barColor(dailyUsagePercent!, meta.color),
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
                                backgroundColor: barColor(weekUsagePercent!, meta.color),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-500">
                        <span>Today {formatNumber(provider.todayMessages)} · Week {formatNumber(provider.weekMessages)}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-500/60">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500/50" />
                      Estimated
                    </div>
                  </>
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

function CodexRealUsage({
  provider,
  codexUsage,
  accent,
}: {
  provider: ProviderSummary;
  codexUsage: CodexUsageSnapshot;
  accent: string;
}) {
  const primary = codexUsage.primaryWindow;
  const secondary = codexUsage.secondaryWindow;

  const planLabel = codexUsage.planType.charAt(0).toUpperCase() + codexUsage.planType.slice(1);

  return (
    <>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-mono text-xl font-bold text-slate-50">
          {formatNumber(provider.totalMessages)}
          <span className="ml-1.5 text-[11px] font-normal text-slate-500">msgs</span>
        </p>
        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
          {planLabel}
        </span>
        {codexUsage.limitReached && (
          <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
            LIMIT
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-2">
        {primary && (
          <RateLimitBar
            label={formatWindowLabel(primary.windowSeconds)}
            usedPercent={primary.usedPercent}
            resetAfterSeconds={primary.resetAfterSeconds}
            resetAt={primary.resetAt}
            accent={accent}
          />
        )}
        {secondary && (
          <RateLimitBar
            label={formatWindowLabel(secondary.windowSeconds)}
            usedPercent={secondary.usedPercent}
            resetAfterSeconds={secondary.resetAfterSeconds}
            resetAt={secondary.resetAt}
            accent={accent}
          />
        )}
        {codexUsage.additionalLimits.map((extra) => (
          <div key={extra.limitName}>
            <p className="text-[10px] text-slate-500 mb-1">{extra.limitName}</p>
            {extra.primaryWindow && (
              <RateLimitBar
                label={formatWindowLabel(extra.primaryWindow.windowSeconds)}
                usedPercent={extra.primaryWindow.usedPercent}
                resetAfterSeconds={extra.primaryWindow.resetAfterSeconds}
                resetAt={extra.primaryWindow.resetAt}
                accent="#A78BFA"
              />
            )}
            {extra.secondaryWindow && (
              <RateLimitBar
                label={formatWindowLabel(extra.secondaryWindow.windowSeconds)}
                usedPercent={extra.secondaryWindow.usedPercent}
                resetAfterSeconds={extra.secondaryWindow.resetAfterSeconds}
                resetAt={extra.secondaryWindow.resetAt}
                accent="#A78BFA"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-500/70">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
        Live
      </div>
    </>
  );
}

function RateLimitBar({
  label,
  usedPercent,
  resetAfterSeconds,
  resetAt,
  accent,
}: {
  label: string;
  usedPercent: number;
  resetAfterSeconds: number;
  resetAt: number;
  accent: string;
}) {
  const pct = Math.min(usedPercent, 100);

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-mono">
          {pct.toFixed(1)}%
          <span className="ml-1 text-slate-600">
            resets {formatResetCountdown(resetAfterSeconds)} ({formatResetTime(resetAt)})
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden ring-1 ring-white/5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: barColor(pct, accent),
          }}
        />
      </div>
    </div>
  );
}
