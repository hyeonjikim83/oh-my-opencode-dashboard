import { formatCost, formatNumber, formatTokens } from "@/lib/utils";
import type { DashboardData, Period } from "@/lib/types";

interface SummaryCardsProps {
  totals: DashboardData["totals"];
  period: Period;
  lastRefreshed?: number;
}

const CARD_ACCENTS = [
  { gradient: "from-orange-500/20 via-amber-500/10 to-transparent", iconBg: "bg-orange-500/10", icon: "💰" },
  { gradient: "from-blue-500/20 via-cyan-500/10 to-transparent", iconBg: "bg-blue-500/10", icon: "💬" },
  { gradient: "from-emerald-500/20 via-teal-500/10 to-transparent", iconBg: "bg-emerald-500/10", icon: "⚡" },
  { gradient: "from-violet-500/20 via-purple-500/10 to-transparent", iconBg: "bg-violet-500/10", icon: "🔄" },
];

export function SummaryCards({ totals, period, lastRefreshed }: SummaryCardsProps) {
  const hasBillingCost = totals.billingCost > 0;
  const isAll = period === "all";
  const periodData = isAll ? null : totals.periods[period];

  const costValue = isAll ? totals.billingCost : (periodData?.billingCost ?? 0);
  const billingSubtext = isAll
    ? [
        `Today ${formatCost(totals.todayBillingCost)}`,
        `Week ${formatCost(totals.weekBillingCost)}`,
        ...(totals.fiveHourSubscriptionCost > 0
          ? [`5h Window ${formatCost(totals.fiveHourSubscriptionCost)}`]
          : []),
      ].join(" · ")
    : `All time ${formatCost(totals.billingCost)}`;

  const messagesValue = isAll ? totals.messages : (periodData?.messages ?? 0);
  const messagesSub = isAll
    ? "Assistant responses with tracked usage"
    : `of ${formatNumber(totals.messages)} all time`;

  const tokensTotal = isAll ? totals.tokens.total : (periodData?.tokens.total ?? 0);
  const tokensIn = isAll ? totals.tokens.input : (periodData?.tokens.input ?? 0);
  const tokensOut = isAll ? totals.tokens.output : (periodData?.tokens.output ?? 0);

  const refreshedLabel = (() => {
    if (!lastRefreshed) return null;
    const elapsedMs = Math.max(0, Date.now() - lastRefreshed);
    const elapsedMinutes = Math.floor(elapsedMs / 60_000);
    if (elapsedMinutes < 1) return "Updated just now";
    return `Updated ${elapsedMinutes}m ago`;
  })();

  const cards = [
    ...(hasBillingCost
      ? [
          {
            label: "Total Cost",
            value: formatCost(costValue),
            sub: billingSubtext,
            accent: CARD_ACCENTS[0],
          },
        ]
      : []),
    {
      label: "Messages",
      value: formatNumber(messagesValue),
      sub: messagesSub,
      accent: CARD_ACCENTS[1],
    },
    {
      label: "Tokens",
      value: formatTokens(tokensTotal),
      sub: `In ${formatTokens(tokensIn)} · Out ${formatTokens(tokensOut)}`,
      accent: CARD_ACCENTS[2],
    },
    {
      label: "Active Sessions (24h)",
      value: formatNumber(totals.sessions),
      sub: "Updated within the last day",
      accent: CARD_ACCENTS[3],
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.accent.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">{card.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.accent.iconBg} text-sm`}>
                  {card.accent.icon}
                </span>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-50">
                {card.value}
              </p>
              <p className="mt-3 text-xs text-slate-500">{card.sub}</p>
            </div>
          </article>
        ))}
      </div>
      {refreshedLabel && (
        <p className="mt-2 text-right text-[11px] text-slate-500">{refreshedLabel}</p>
      )}
    </section>
  );
}
