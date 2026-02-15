import type {
  RawSession,
  RawMessage,
  SessionSummary,
  AgentSummary,
  ProviderSummary,
  DashboardData,
  TimelineEntry,
} from "@/lib/types";
import { isProviderBilling } from "@/lib/constants";
import {
  getMessageAgent,
  getMessageModelID,
  getMessageProviderID,
  getMessageCost,
  getMessageTokens,
  getResponseTime,
  isAssistantMessage,
} from "@/lib/data/parser";

function getStartOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? 6 : day - 1; // offset to Monday
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

function getStartOfMonth(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function aggregateDashboardData(
  rawSessions: RawSession[],
  allMessages: RawMessage[],
): DashboardData {
  const msgBySession = new Map<string, RawMessage[]>();
  for (const msg of allMessages) {
    const list = msgBySession.get(msg.sessionID) ?? [];
    list.push(msg);
    msgBySession.set(msg.sessionID, list);
  }

  const sessions = rawSessions.map((s) =>
    aggregateSession(s, msgBySession.get(s.id) ?? []),
  );

  const billable = allMessages.filter(isAssistantMessage);

  const agents = aggregateByAgent(billable);
  const providers = aggregateByProvider(billable);
  const totals = computeTotals(rawSessions, billable);
  const timeline = computeTimeline(billable);

  return { sessions, agents, providers, totals, timeline };
}

function aggregateSession(
  session: RawSession,
  messages: RawMessage[],
): SessionSummary {
  const billable = messages.filter(isAssistantMessage);

  const agents: Record<string, {
    cost: number;
    messages: number;
    lastActiveAt: number;
    provider: string;
    model: string;
  }> = {};
  const tokens = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 };

  let totalCost = 0;
  let billingCost = 0;

  for (const msg of billable) {
    const agent = getMessageAgent(msg);
    if (!agents[agent]) {
      agents[agent] = { cost: 0, messages: 0, lastActiveAt: 0, provider: "unknown", model: "unknown" };
    }
    const cost = getMessageCost(msg);
    agents[agent].cost += cost;
    agents[agent].messages += 1;

    const msgTime = msg.time.completed ?? msg.time.created;
    if (msgTime > agents[agent].lastActiveAt) {
      agents[agent].lastActiveAt = msgTime;
      agents[agent].provider = getMessageProviderID(msg);
      agents[agent].model = getMessageModelID(msg);
    }

    totalCost += cost;
    if (isProviderBilling(getMessageProviderID(msg))) {
      billingCost += cost;
    }

    const t = getMessageTokens(msg);
    tokens.input += t.input;
    tokens.output += t.output;
    tokens.reasoning += t.reasoning;
    tokens.cacheRead += t.cacheRead;
    tokens.cacheWrite += t.cacheWrite;
    tokens.total += t.total;
  }

  return {
    id: session.id,
    slug: session.slug,
    title: session.title || session.slug,
    directory: session.directory,
    duration: session.time.updated - session.time.created,
    createdAt: session.time.created,
    updatedAt: session.time.updated,
    totalCost,
    billingCost,
    messageCount: billable.length,
    agents,
    tokens,
  };
}

function aggregateByAgent(billable: RawMessage[]): AgentSummary[] {
  const map = new Map<
    string,
    {
      cost: number;
      billingCost: number;
      count: number;
      tokensIn: number;
      tokensOut: number;
      tokensReasoning: number;
      cacheRead: number;
      input: number; // raw input for cache hit rate denominator
      responseTimes: number[];
      models: Set<string>;
      providers: Set<string>;
      hasBillingProvider: boolean;
    }
  >();

  for (const msg of billable) {
    const agent = getMessageAgent(msg);
    let entry = map.get(agent);
    if (!entry) {
      entry = {
        cost: 0,
        billingCost: 0,
        count: 0,
        tokensIn: 0,
        tokensOut: 0,
        tokensReasoning: 0,
        cacheRead: 0,
        input: 0,
        responseTimes: [],
        models: new Set(),
        providers: new Set(),
        hasBillingProvider: false,
      };
      map.set(agent, entry);
    }

    const cost = getMessageCost(msg);
    const providerID = getMessageProviderID(msg);
    const isBilling = isProviderBilling(providerID);

    entry.cost += cost;
    if (isBilling) {
      entry.billingCost += cost;
    }
    if (isBilling) {
      entry.hasBillingProvider = true;
    }
    entry.count += 1;

    const t = getMessageTokens(msg);
    entry.tokensIn += t.input;
    entry.tokensOut += t.output;
    entry.tokensReasoning += t.reasoning;
    entry.cacheRead += t.cacheRead;
    entry.input += t.input;

    const rt = getResponseTime(msg);
    if (rt > 0) entry.responseTimes.push(rt);

    entry.models.add(getMessageModelID(msg));
    entry.providers.add(getMessageProviderID(msg));
  }

  const results: AgentSummary[] = [];
  for (const [agent, e] of map) {
    const denominator = e.cacheRead + e.input;
    results.push({
      agent,
      totalCost: e.cost,
      billingCost: e.billingCost,
      messageCount: e.count,
      avgCostPerMessage: e.count > 0 ? e.cost / e.count : 0,
      totalTokensIn: e.tokensIn,
      totalTokensOut: e.tokensOut,
      totalTokensReasoning: e.tokensReasoning,
      totalCacheRead: e.cacheRead,
      cacheHitRate: denominator > 0 ? e.cacheRead / denominator : 0,
      avgResponseTime:
        e.responseTimes.length > 0
          ? e.responseTimes.reduce((a, b) => a + b, 0) / e.responseTimes.length
          : 0,
      models: [...e.models],
      providers: [...e.providers],
      hasBillingProvider: e.hasBillingProvider,
    });
  }

  return results.sort((a, b) => {
    if (a.agent === "unknown") return 1;
    if (b.agent === "unknown") return -1;
    return b.totalCost - a.totalCost;
  });
}

function aggregateByProvider(billable: RawMessage[]): ProviderSummary[] {
  const todayStart = getStartOfToday();
  const weekStart = getStartOfWeek();

  const map = new Map<
    string,
    {
      cost: number;
      count: number;
      todayCount: number;
      weekCount: number;
      todayTokens: number;
      weekTokens: number;
      models: Map<string, { cost: number; messages: number; tokens: number }>;
    }
  >();

  for (const msg of billable) {
    const provider = getMessageProviderID(msg);
    let entry = map.get(provider);
    if (!entry) {
      entry = { 
        cost: 0, 
        count: 0, 
        todayCount: 0, 
        weekCount: 0,
        todayTokens: 0,
        weekTokens: 0,
        models: new Map() 
      };
      map.set(provider, entry);
    }

    const cost = getMessageCost(msg);
    const t = getMessageTokens(msg);
    const created = msg.time.created;

    entry.cost += cost;
    entry.count += 1;

    if (created >= todayStart) {
      entry.todayCount += 1;
      entry.todayTokens += t.total;
    }
    if (created >= weekStart) {
      entry.weekCount += 1;
      entry.weekTokens += t.total;
    }

    const modelID = getMessageModelID(msg);
    let modelEntry = entry.models.get(modelID);
    if (!modelEntry) {
      modelEntry = { cost: 0, messages: 0, tokens: 0 };
      entry.models.set(modelID, modelEntry);
    }
    modelEntry.cost += cost;
    modelEntry.messages += 1;
    modelEntry.tokens += t.total;
  }

  const results: ProviderSummary[] = [];
  for (const [provider, e] of map) {
    const models: Record<string, { cost: number; messages: number; tokens: number }> = {};
    for (const [modelID, m] of e.models) {
      models[modelID] = m;
    }
    results.push({
      provider,
      totalCost: e.cost,
      totalMessages: e.count,
      todayMessages: e.todayCount,
      weekMessages: e.weekCount,
      todayTokens: e.todayTokens,
      weekTokens: e.weekTokens,
      models,
    });
  }

  return results.sort((a, b) => b.totalCost - a.totalCost);
}

function computeTotals(
  rawSessions: RawSession[],
  billable: RawMessage[],
): DashboardData["totals"] {
  const now = Date.now();
  const todayStart = getStartOfToday();
  const weekStart = getStartOfWeek();
  const monthStart = getStartOfMonth();

  let cost = 0;
  let billingCost = 0;
  let todayCost = 0;
  let weekCost = 0;
  let monthCost = 0;
  let todayBillingCost = 0;
  let weekBillingCost = 0;
  let monthBillingCost = 0;
  const tokens = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 };

  for (const msg of billable) {
    const c = getMessageCost(msg);
    const isBilling = isProviderBilling(getMessageProviderID(msg));
    cost += c;
    if (isBilling) billingCost += c;

    const created = msg.time.created;
    if (created >= todayStart) {
      todayCost += c;
      if (isBilling) todayBillingCost += c;
    }
    if (created >= weekStart) {
      weekCost += c;
      if (isBilling) weekBillingCost += c;
    }
    if (created >= monthStart) {
      monthCost += c;
      if (isBilling) monthBillingCost += c;
    }

    const t = getMessageTokens(msg);
    tokens.input += t.input;
    tokens.output += t.output;
    tokens.reasoning += t.reasoning;
    tokens.cacheRead += t.cacheRead;
    tokens.cacheWrite += t.cacheWrite;
    tokens.total += t.total;
  }

  // Active sessions: updated within 24h
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const activeSessions = rawSessions.filter((s) => s.time.updated >= dayAgo).length;

  return {
    cost,
    billingCost,
    messages: billable.length,
    sessions: activeSessions,
    tokens,
    todayCost,
    weekCost,
    monthCost,
    todayBillingCost,
    weekBillingCost,
    monthBillingCost,
  };
}

function computeTimeline(billable: RawMessage[]): TimelineEntry[] {
  const map = new Map<string, { cost: number; messages: number }>();

  for (const msg of billable) {
    const d = new Date(msg.time.created);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hour = d.getHours();
    const key = `${date}|${hour}`;

    let entry = map.get(key);
    if (!entry) {
      entry = { cost: 0, messages: 0 };
      map.set(key, entry);
    }
    entry.cost += getMessageCost(msg);
    entry.messages += 1;
  }

  const results: TimelineEntry[] = [];
  for (const [key, e] of map) {
    const [date, hourStr] = key.split("|");
    results.push({ date, hour: Number(hourStr), cost: e.cost, messages: e.messages });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
}
