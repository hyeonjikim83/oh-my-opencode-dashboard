import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentBreakdownChart } from "@/components/session/AgentBreakdownChart";
import { getMessageAgent, getMessageModelID, getMessageProviderID, getMessageTokens, isAssistantMessage } from "@/lib/data/parser";
import { readAllSessions, readMessagesForSessionTree, readChildSessions } from "@/lib/data/reader";
import { AGENT_META, PROVIDER_MAP, isProviderBilling } from "@/lib/constants";
import { formatCost, formatDateTime, formatDuration, formatNumber, formatTokens } from "@/lib/utils";

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export const dynamic = "force-dynamic";

interface ProviderAccum {
  cost: number;
  messages: number;
  tokens: number;
  models: Set<string>;
  agents: Map<string, { messages: number; tokens: number; cost: number }>;
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { sessionId } = await params;
  const sessions = await readAllSessions();
  const session = sessions.find((entry) => entry.id === sessionId);

  if (!session) {
    notFound();
  }

  const messages = await readMessagesForSessionTree(sessionId);
  const childSessions = await readChildSessions(sessionId);
  const billableMessages = messages.filter(isAssistantMessage);

  const providerMap = new Map<string, ProviderAccum>();
  let billingCost = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const message of billableMessages) {
    const agent = getMessageAgent(message);
    const providerID = getMessageProviderID(message);
    const modelID = getMessageModelID(message);
    const cost = message.cost ?? 0;
    const t = getMessageTokens(message);

    let prov = providerMap.get(providerID);
    if (!prov) {
      prov = { cost: 0, messages: 0, tokens: 0, models: new Set(), agents: new Map() };
      providerMap.set(providerID, prov);
    }
    prov.cost += cost;
    prov.messages += 1;
    prov.tokens += t.total;
    prov.models.add(modelID);

    const agEntry = prov.agents.get(agent) ?? { messages: 0, tokens: 0, cost: 0 };
    agEntry.messages += 1;
    agEntry.tokens += t.total;
    agEntry.cost += cost;
    prov.agents.set(agent, agEntry);

    if (isProviderBilling(providerID)) billingCost += cost;
    totalInput += t.input;
    totalOutput += t.output;
  }

  const hasBillingCost = billingCost > 0;

  const providerBreakdown = [...providerMap.entries()]
    .map(([id, p]) => ({ id, ...p, models: [...p.models] }))
    .sort((a, b) => b.messages - a.messages);

  const agentBreakdownForChart = [...new Map<string, { cost: number; messages: number; provider: string }>()];
  for (const prov of providerBreakdown) {
    for (const [agent, data] of prov.agents) {
      agentBreakdownForChart.push([agent, { cost: data.cost, messages: data.messages, provider: prov.id }]);
    }
  }
  const chartData = agentBreakdownForChart
    .reduce<{ agent: string; cost: number; messages: number; provider: string }[]>((acc, [agent, d]) => {
      const existing = acc.find((a) => a.agent === agent);
      if (existing) {
        existing.cost += d.cost;
        existing.messages += d.messages;
      } else {
        acc.push({ agent, ...d });
      }
      return acc;
    }, [])
    .sort((a, b) => b.cost - a.cost);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="group inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-200">
            <span className="transition-transform group-hover:-translate-x-0.5">←</span> Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-50">{session.title || session.slug}</h1>
          <p className="mt-1 text-sm text-slate-500">{session.directory}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasBillingCost && (
          <article className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <p className="text-sm font-medium text-slate-400">Session Cost</p>
              <p className="mt-3 font-mono text-3xl font-bold text-slate-50">{formatCost(billingCost)}</p>
            </div>
          </article>
        )}
        <article className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-400">Messages</p>
            <p className="mt-3 font-mono text-3xl font-bold text-slate-50">{billableMessages.length}</p>
          </div>
        </article>
        <article className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-400">Tokens In/Out</p>
            <p className="mt-3 font-mono text-2xl font-bold text-slate-50">
              {formatTokens(totalInput)} / {formatTokens(totalOutput)}
            </p>
          </div>
        </article>
        <article className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-400">Duration</p>
            <p className="mt-3 font-mono text-3xl font-bold text-slate-50">
              {formatDuration(session.time.updated - session.time.created)}
            </p>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-slate-100">Provider Breakdown</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providerBreakdown.map((prov) => {
            const meta = PROVIDER_MAP[prov.id] ?? { name: prov.id, color: "#6B7280", icon: "❓", billingType: "billing" as const };
            const isBilling = isProviderBilling(prov.id);
            const agents = [...prov.agents.entries()]
              .sort((a, b) => b[1].messages - a[1].messages);

            return (
              <article
                key={prov.id}
                className="card-hover group relative overflow-hidden rounded-xl border border-slate-800/50 bg-slate-950/50 p-4"
              >
                <div
                  className="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
                  style={{ background: `radial-gradient(ellipse at top right, ${meta.color}, transparent 70%)` }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-300">{meta.icon} {meta.name}</p>
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_var(--glow)]"
                      style={{ backgroundColor: meta.color, "--glow": `${meta.color}40` } as React.CSSProperties}
                    />
                  </div>

                  {isBilling ? (
                    <>
                      <p className="mt-3 font-mono text-2xl font-bold text-slate-50">
                        {formatCost(prov.cost)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatNumber(prov.messages)} messages · {formatTokens(prov.tokens)} tokens
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 font-mono text-2xl font-bold text-slate-50">
                        {formatNumber(prov.messages)} <span className="text-sm font-normal text-slate-400">msgs</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatTokens(prov.tokens)} tokens (account-based)
                      </p>
                    </>
                  )}

                  <div className="mt-3 space-y-1">
                    {agents.map(([agent, data]) => {
                      const agMeta = AGENT_META[agent] ?? { emoji: "❓", label: agent };
                      return (
                        <div key={agent} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{agMeta.emoji} {agMeta.label}</span>
                          <span className="font-mono text-slate-500">
                            {formatNumber(data.messages)} msgs
                            {isBilling && data.cost > 0 && (
                              <> · {formatCost(data.cost)}</>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 truncate text-xs text-slate-500">
                    {prov.models.length > 0 ? prov.models.join(" · ") : "No models"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {childSessions.length > 0 && (
        <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Subagent Sessions</h2>
            <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
              {childSessions.length} session{childSessions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-4 space-y-1">
            {childSessions.map((child) => {
              const agentMatch = child.title.match(/@(\S+)\s+subagent/i);
              const agentName = agentMatch ? agentMatch[1] : null;
              const agMeta = agentName ? AGENT_META[agentName] : null;

              return (
                <Link
                  key={child.id}
                  href={`/sessions/${child.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-transparent px-4 py-3 transition-all hover:border-slate-800/60 hover:bg-slate-800/30"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/60 text-sm ring-1 ring-white/5">
                    {agMeta?.emoji ?? "🔧"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200 transition-colors group-hover:text-white">
                      {agMeta?.label ?? child.slug}
                    </p>
                    {agMeta && (
                      <p className="text-[11px] text-slate-500">{agMeta.role}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(child.time.updated)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {hasBillingCost && (
          <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-slate-100">Cost Breakdown</h2>
            <div className="mt-4">
              <AgentBreakdownChart data={chartData} />
            </div>
            <div className="mt-4 space-y-0.5">
              {chartData.filter((e) => isProviderBilling(e.provider) && e.cost > 0).map((entry) => {
                const meta = AGENT_META[entry.agent] ?? { emoji: "❓", label: entry.agent };
                return (
                  <div key={entry.agent} className="flex items-center justify-between rounded-lg px-3 py-3 text-sm transition-colors hover:bg-slate-800/30">
                    <p className="text-slate-300">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-800/60 text-xs ring-1 ring-white/5">
                        {meta.emoji}
                      </span>
                      {meta.label}
                      <span className="ml-2 text-xs text-slate-500">{entry.messages} msgs</span>
                    </p>
                    <p className="font-mono font-medium text-slate-100">{formatCost(entry.cost)}</p>
                  </div>
                );
              })}
            </div>
          </article>
        )}

        <article className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-100">Message Timeline</h2>
          <p className="mt-1 text-xs text-slate-500">
            Created {formatDateTime(session.time.created)} · Updated {formatDateTime(session.time.updated)}
          </p>

          <div className="mt-4 max-h-[28rem] space-y-0.5 overflow-y-auto pr-1">
            {messages.map((message) => {
              const agent = getMessageAgent(message);
              const providerID = getMessageProviderID(message);
              const provMeta = PROVIDER_MAP[providerID];
              const meta = AGENT_META[agent] ?? {
                emoji: message.role === "assistant" ? "🤖" : "👤",
                label: agent,
                role: message.role,
              };

              return (
                <div key={message.id} className="rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-slate-800/40 hover:bg-slate-800/20">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-300">
                      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-800/60 text-[10px] ring-1 ring-white/5">
                        {meta.emoji}
                      </span>
                      {meta.label}
                      <span className="ml-2 rounded-full bg-slate-800/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                        {message.role}
                      </span>
                      {provMeta && (
                        <span
                          className="ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle shadow-[0_0_4px_var(--glow)]"
                          style={{ backgroundColor: provMeta.color, "--glow": `${provMeta.color}40` } as React.CSSProperties}
                          title={provMeta.name}
                        />
                      )}
                    </p>
                    <p className="shrink-0 text-xs text-slate-500">{formatDateTime(message.time.created)}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3 pl-6 text-[11px] text-slate-500">
                    <span className="font-mono">{message.id.slice(0, 14)}</span>
                    {provMeta && <span>{provMeta.icon} {provMeta.name}</span>}
                    {isProviderBilling(providerID) && (message.cost ?? 0) > 0 && (
                      <span className="font-mono text-slate-400">{formatCost(message.cost ?? 0)}</span>
                    )}
                    <span className="font-mono">In {formatTokens(message.tokens?.input ?? 0)}</span>
                    <span className="font-mono">Out {formatTokens(message.tokens?.output ?? 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
