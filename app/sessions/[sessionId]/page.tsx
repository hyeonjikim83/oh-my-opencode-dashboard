import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentBreakdownChart } from "@/components/session/AgentBreakdownChart";
import { getMessageAgent, getMessageModelID, getMessageProviderID, getMessageTokens, isAssistantMessage } from "@/lib/data/parser";
import { readAllSessions, readMessagesForSession } from "@/lib/data/reader";
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

  const messages = await readMessagesForSession(sessionId);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">{session.title || session.slug}</h1>
          <p className="mt-1 text-sm text-slate-500">{session.directory}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasBillingCost && (
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-500">Session Cost</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-slate-100">{formatCost(billingCost)}</p>
          </article>
        )}
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-500">Messages</p>
          <p className="mt-3 font-mono text-3xl font-semibold text-slate-100">{billableMessages.length}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-500">Tokens In/Out</p>
          <p className="mt-3 font-mono text-2xl font-semibold text-slate-100">
            {formatTokens(totalInput)} / {formatTokens(totalOutput)}
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-500">Duration</p>
          <p className="mt-3 font-mono text-3xl font-semibold text-slate-100">
            {formatDuration(session.time.updated - session.time.created)}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Provider Breakdown</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providerBreakdown.map((prov) => {
            const meta = PROVIDER_MAP[prov.id] ?? { name: prov.id, color: "#6B7280", icon: "❓", billingType: "billing" as const };
            const isBilling = isProviderBilling(prov.id);
            const agents = [...prov.agents.entries()]
              .sort((a, b) => b[1].messages - a[1].messages);

            return (
              <article key={prov.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">{meta.icon} {meta.name}</p>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                </div>

                {isBilling ? (
                  <>
                    <p className="mt-3 font-mono text-2xl font-semibold text-slate-100">
                      {formatCost(prov.cost)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatNumber(prov.messages)} messages · {formatTokens(prov.tokens)} tokens
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-mono text-2xl font-semibold text-slate-100">
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

                <p className="mt-3 truncate text-xs text-slate-400">
                  {prov.models.length > 0 ? prov.models.join(" · ") : "No models"}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {hasBillingCost && (
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">Cost Breakdown</h2>
            <div className="mt-4">
              <AgentBreakdownChart data={chartData} />
            </div>
            <div className="mt-4 divide-y divide-slate-800">
              {chartData.filter((e) => isProviderBilling(e.provider) && e.cost > 0).map((entry) => {
                const meta = AGENT_META[entry.agent] ?? { emoji: "❓", label: entry.agent };
                return (
                  <div key={entry.agent} className="flex items-center justify-between py-3 text-sm">
                    <p className="text-slate-300">
                      {meta.emoji} {meta.label}
                      <span className="ml-2 text-xs text-slate-500">{entry.messages} msgs</span>
                    </p>
                    <p className="font-mono text-slate-100">{formatCost(entry.cost)}</p>
                  </div>
                );
              })}
            </div>
          </article>
        )}

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Message Timeline</h2>
          <p className="mt-1 text-xs text-slate-500">
            Created {formatDateTime(session.time.created)} · Updated {formatDateTime(session.time.updated)}
          </p>

          <div className="mt-4 max-h-[28rem] divide-y divide-slate-800 overflow-y-auto">
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
                <div key={message.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-300">
                      {meta.emoji} {meta.label}
                      <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{message.role}</span>
                      {provMeta && (
                        <span
                          className="ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                          style={{ backgroundColor: provMeta.color }}
                          title={provMeta.name}
                        />
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(message.time.created)}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>ID {message.id.slice(0, 14)}</span>
                    {provMeta && <span>{provMeta.icon} {provMeta.name}</span>}
                    {isProviderBilling(providerID) && (message.cost ?? 0) > 0 && (
                      <span>Cost {formatCost(message.cost ?? 0)}</span>
                    )}
                    <span>In {formatTokens(message.tokens?.input ?? 0)}</span>
                    <span>Out {formatTokens(message.tokens?.output ?? 0)}</span>
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
