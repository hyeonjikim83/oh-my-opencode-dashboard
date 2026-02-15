"use client";

import { motion } from "framer-motion";
import { formatCost, formatNumber, formatTokens } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";

interface SummaryCardsProps {
  totals: DashboardData["totals"];
}

export function SummaryCards({ totals }: SummaryCardsProps) {
  const hasBillingCost = totals.billingCost > 0;
  const cards = [
    ...(hasBillingCost
      ? [
          {
            title: "Total Cost",
            value: formatCost(totals.billingCost),
            detail: `Today ${formatCost(totals.todayBillingCost)} · Week ${formatCost(totals.weekBillingCost)}`,
          },
        ]
      : []),
    {
      title: "Messages",
      value: formatNumber(totals.messages),
      detail: "Assistant responses with tracked usage",
    },
    {
      title: "Tokens",
      value: formatTokens(totals.tokens.total),
      detail: `In ${formatTokens(totals.tokens.input)} · Out ${formatTokens(totals.tokens.output)}`,
    },
    {
      title: "Active Sessions (24h)",
      value: formatNumber(totals.sessions),
      detail: "Updated within the last day",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.article
          key={card.title}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="panel-frame panel-frame-hover group relative overflow-hidden rounded-2xl p-6"
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl p-px [background:linear-gradient(120deg,rgba(34,211,238,0.55),rgba(125,211,252,0.1),rgba(251,191,36,0.5))] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:xor]" />
          <div className="pointer-events-none absolute -right-8 top-4 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl transition duration-300 group-hover:bg-cyan-300/30" />
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.title}</p>
          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-slate-50">{card.value}</p>
          <p className="mt-3 text-xs text-slate-300/80">{card.detail}</p>
        </motion.article>
      ))}
    </section>
  );
}
