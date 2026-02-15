import { formatCost, formatNumber, formatTokens } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";

interface SummaryCardsProps {
  totals: DashboardData["totals"];
}

export function SummaryCards({ totals }: SummaryCardsProps) {
  const hasBillingCost = totals.billingCost > 0;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {hasBillingCost && (
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-500">Total Cost</p>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-slate-100">
            {formatCost(totals.billingCost)}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Today {formatCost(totals.todayBillingCost)} · Week {formatCost(totals.weekBillingCost)}
          </p>
        </article>
      )}

      <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-500">Messages</p>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-slate-100">
          {formatNumber(totals.messages)}
        </p>
        <p className="mt-3 text-xs text-slate-400">Assistant responses with tracked usage</p>
      </article>

      <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-500">Tokens</p>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-slate-100">
          {formatTokens(totals.tokens.total)}
        </p>
        <p className="mt-3 text-xs text-slate-400">
          In {formatTokens(totals.tokens.input)} · Out {formatTokens(totals.tokens.output)}
        </p>
      </article>

      <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-500">Active Sessions (24h)</p>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-slate-100">
          {formatNumber(totals.sessions)}
        </p>
        <p className="mt-3 text-xs text-slate-400">Updated within the last day</p>
      </article>
    </section>
  );
}
