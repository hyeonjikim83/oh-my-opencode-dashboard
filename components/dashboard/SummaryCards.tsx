import { formatCost, formatNumber, formatTokens } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";

interface SummaryCardsProps {
  totals: DashboardData["totals"];
}

const CARD_ACCENTS = [
  { gradient: "from-orange-500/20 via-amber-500/10 to-transparent", iconBg: "bg-orange-500/10", icon: "💰" },
  { gradient: "from-blue-500/20 via-cyan-500/10 to-transparent", iconBg: "bg-blue-500/10", icon: "💬" },
  { gradient: "from-emerald-500/20 via-teal-500/10 to-transparent", iconBg: "bg-emerald-500/10", icon: "⚡" },
  { gradient: "from-violet-500/20 via-purple-500/10 to-transparent", iconBg: "bg-violet-500/10", icon: "🔄" },
];

export function SummaryCards({ totals }: SummaryCardsProps) {
  const hasBillingCost = totals.billingCost > 0;

  const cards = [
    ...(hasBillingCost
      ? [
          {
            label: "Total Cost",
            value: formatCost(totals.billingCost),
            sub: `Today ${formatCost(totals.todayBillingCost)} · Week ${formatCost(totals.weekBillingCost)}`,
            accent: CARD_ACCENTS[0],
          },
        ]
      : []),
    {
      label: "Messages",
      value: formatNumber(totals.messages),
      sub: "Assistant responses with tracked usage",
      accent: CARD_ACCENTS[1],
    },
    {
      label: "Tokens",
      value: formatTokens(totals.tokens.total),
      sub: `In ${formatTokens(totals.tokens.input)} · Out ${formatTokens(totals.tokens.output)}`,
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
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </section>
  );
}
