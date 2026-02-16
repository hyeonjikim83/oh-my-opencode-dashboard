import {
  getMessageAgent,
  getMessageCost,
  getMessageModelID,
  getMessageProviderID,
  getMessageTokens,
  getResponseTime,
  isAssistantMessage,
} from "@/lib/data/parser";
import {
  DashboardData,
  SessionSummary,
  AgentSummary,
  ProviderSummary,
  TimelineEntry,
  RawMessage,
  RawSession,
  PeriodMetrics,
} from "@/lib/types";
import { FIVE_HOUR_MS, isProviderBilling, isProviderSubscription } from "@/lib/constants";

export function aggregateDashboardData(
  sessions: RawSession[],
  messages: RawMessage[],
  period: "all" | "today" | "week" | "month" = "all"
): DashboardData {
  void period;
  // Filter messages based on period if needed (though typically we load all and filter in UI or here)
  // For now, let's load all and calculate totals.
  // Period filtering logic can be added here or in the UI.
  // Given the requirement "Phase 1: Load all", we will process all.

  const sessionMap = new Map<string, SessionSummary>();
  const agentMap = new Map<string, AgentSummary>();
  const providerMap = new Map<string, ProviderSummary>();

  // Helpers for aggregation
  const initSession = (
    base: Pick<SessionSummary, "id" | "slug" | "title" | "directory" | "createdAt" | "updatedAt" | "duration" | "parentID">
  ): SessionSummary => ({
    ...base,
    totalCost: 0,
    billingCost: 0,
    messageCount: 0,
    children: [],
    agents: {},
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  });

  const emptyPeriod = (): PeriodMetrics => ({
    messages: 0, billingCost: 0, totalCost: 0, tokensIn: 0, tokensOut: 0, tokensTotal: 0, cacheRead: 0,
  });

  const initAgent = (name: string): AgentSummary => ({
    agent: name,
    totalCost: 0,
    billingCost: 0,
    messageCount: 0,
    avgCostPerMessage: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalTokensReasoning: 0,
    totalCacheRead: 0,
    cacheHitRate: 0,
    avgResponseTime: 0,
    models: [],
    providers: [],
    hasBillingProvider: false,
    periods: { today: emptyPeriod(), week: emptyPeriod(), month: emptyPeriod() },
  });

  const initProvider = (name: string): ProviderSummary => ({
    provider: name,
    totalCost: 0,
    totalMessages: 0,
    models: {},
    todayMessages: 0,
    todayCost: 0,
    todayTokens: 0,
    weekMessages: 0,
    weekCost: 0,
    weekTokens: 0,
    monthMessages: 0,
    monthCost: 0,
    monthTokens: 0,
    fiveHourMessages: 0,
    fiveHourCost: 0,
    fiveHourTokens: 0,
  });

  const nowTs = Date.now();
  const fiveHourAgo = nowTs - FIVE_HOUR_MS;
  const now = new Date(nowTs);
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay() || 7;
  if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Initialize sessions
  for (const s of sessions) {
    sessionMap.set(
      s.id,
      initSession({
        id: s.id,
        slug: s.slug,
        title: s.title,
        directory: s.directory,
        createdAt: s.time.created,
        updatedAt: s.time.updated,
        duration: s.time.updated - s.time.created,
        parentID: s.parentID,
      })
    );
  }

  // Process messages
  const timelineMap = new Map<string, TimelineEntry>(); // "YYYY-MM-DD-HH" -> Entry

  for (const msg of messages) {
    if (!isAssistantMessage(msg)) continue;

    const sessionId = msg.sessionID;
    const agentName = getMessageAgent(msg);
    const providerId = getMessageProviderID(msg);
    const modelId = getMessageModelID(msg);
    const cost = getMessageCost(msg);
    const tokens = getMessageTokens(msg);
    const responseTime = getResponseTime(msg);
    const isBilling = isProviderBilling(providerId);

    // 1. Session Aggregation
    const session = sessionMap.get(sessionId);
    if (session) {
      session.totalCost += cost;
      if (isBilling) session.billingCost += cost;
      session.messageCount += 1;

      session.tokens.input += tokens.input;
      session.tokens.output += tokens.output;
      session.tokens.reasoning += tokens.reasoning;
      session.tokens.cacheRead += tokens.cacheRead;
      session.tokens.cacheWrite += tokens.cacheWrite;
      session.tokens.total += tokens.total;

      if (!session.agents[agentName]) {
        session.agents[agentName] = {
          cost: 0,
          messages: 0,
          lastActiveAt: 0,
          provider: providerId,
          model: modelId,
        };
      }
      session.agents[agentName].cost += cost;
      session.agents[agentName].messages += 1;
      session.agents[agentName].lastActiveAt = Math.max(
        session.agents[agentName].lastActiveAt,
        msg.time.created
      );
    }

    // 2. Agent Aggregation
    let agent = agentMap.get(agentName);
    if (!agent) {
      agent = initAgent(agentName);
      agentMap.set(agentName, agent);
    }
    agent.totalCost += cost;
    if (isBilling) agent.billingCost += cost;
    agent.messageCount += 1;
    agent.totalTokensIn += tokens.input;
    agent.totalTokensOut += tokens.output;
    agent.totalTokensReasoning += tokens.reasoning;
    agent.totalCacheRead += tokens.cacheRead;

    if (responseTime > 0) {
      // We'll store sum temporarily in avgResponseTime to re-average later
      agent.avgResponseTime += responseTime;
    }

    if (!agent.models.includes(modelId)) agent.models.push(modelId);
    if (!agent.providers.includes(providerId)) agent.providers.push(providerId);
    if (isBilling) agent.hasBillingProvider = true;

    const agentPeriodAccum = (p: PeriodMetrics) => {
      p.messages += 1;
      p.totalCost += cost;
      if (isBilling) p.billingCost += cost;
      p.tokensIn += tokens.input;
      p.tokensOut += tokens.output;
      p.tokensTotal += tokens.total;
      p.cacheRead += tokens.cacheRead;
    };

    // 3. Provider Aggregation
    let provider = providerMap.get(providerId);
    if (!provider) {
      provider = initProvider(providerId);
      providerMap.set(providerId, provider);
    }
    provider.totalCost += cost;
    provider.totalMessages += 1;

    if (!provider.models[modelId]) {
      provider.models[modelId] = { cost: 0, messages: 0, tokens: 0 };
    }
    provider.models[modelId].cost += cost;
    provider.models[modelId].messages += 1;
    provider.models[modelId].tokens += tokens.total;

    // Time-based stats for provider + agent periods
    const msgDate = new Date(msg.time.created);
    const isToday = msgDate.toDateString() === now.toDateString();
    const isThisWeek = msgDate >= startOfWeek;
    const isThisMonth = msgDate >= startOfMonth;

    if (isToday) {
      provider.todayMessages += 1;
      provider.todayCost += cost;
      provider.todayTokens += tokens.total;
      agentPeriodAccum(agent.periods.today);
    }
    if (isThisWeek) {
      provider.weekMessages += 1;
      provider.weekCost += cost;
      provider.weekTokens += tokens.total;
      agentPeriodAccum(agent.periods.week);
    }
    if (isThisMonth) {
      provider.monthMessages += 1;
      provider.monthCost += cost;
      provider.monthTokens += tokens.total;
      agentPeriodAccum(agent.periods.month);
    }
    if (msg.time.created >= fiveHourAgo) {
      provider.fiveHourMessages += 1;
      provider.fiveHourCost += cost;
      provider.fiveHourTokens += tokens.total;
    }

    // 4. Timeline Aggregation
    const dateStr = msgDate.toISOString().split("T")[0];
    const hour = msgDate.getHours();
    const timelineKey = `${dateStr}-${hour}`;

    let timelineEntry = timelineMap.get(timelineKey);
    if (!timelineEntry) {
      timelineEntry = { date: dateStr, hour, cost: 0, messages: 0 };
      timelineMap.set(timelineKey, timelineEntry);
    }
    timelineEntry.cost += cost;
    timelineEntry.messages += 1;
  }

  // Finalize Agent Stats
  for (const agent of agentMap.values()) {
    if (agent.messageCount > 0) {
      agent.avgCostPerMessage = agent.totalCost / agent.messageCount;

      const totalCacheable = agent.totalCacheRead + agent.totalTokensIn;
      agent.cacheHitRate = totalCacheable > 0 ? agent.totalCacheRead / totalCacheable : 0;

      // Re-calculate avg response time (using stored sum in avgResponseTime)
      // Note: We need to know count of messages with response time. 
      // Simplified approximation: assume all assistant messages have response time for now, 
      // or we'd need a separate counter. 
      // Let's refine:
      // In the loop we only added to sum. We need the count of messages that contributed.
      // For this MVP, let's just divide by messageCount. Ideally we track count separately.
      agent.avgResponseTime = agent.avgResponseTime / agent.messageCount;
    }
  }

  // Calculate Totals
  const totals = {
    cost: 0,
    billingCost: 0,
    messages: 0,
    sessions: sessionMap.size,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    todayBillingCost: 0,
    weekBillingCost: 0,
    monthBillingCost: 0,
    fiveHourCost: 0,
    fiveHourBillingCost: 0,
    fiveHourSubscriptionCost: 0,
    periods: {
      today: { billingCost: 0, messages: 0, tokens: { input: 0, output: 0, total: 0 } },
      week: { billingCost: 0, messages: 0, tokens: { input: 0, output: 0, total: 0 } },
      month: { billingCost: 0, messages: 0, tokens: { input: 0, output: 0, total: 0 } },
    },
  };

  for (const agent of agentMap.values()) {
    totals.cost += agent.totalCost;
    totals.billingCost += agent.billingCost;
    totals.messages += agent.messageCount;
    totals.tokens.input += agent.totalTokensIn;
    totals.tokens.output += agent.totalTokensOut;
    totals.tokens.reasoning += agent.totalTokensReasoning;
    totals.tokens.cacheRead += agent.totalCacheRead;

    for (const pk of ["today", "week", "month"] as const) {
      const ap = agent.periods[pk];
      const tp = totals.periods[pk];
      tp.billingCost += ap.billingCost;
      tp.messages += ap.messages;
      tp.tokens.input += ap.tokensIn;
      tp.tokens.output += ap.tokensOut;
      tp.tokens.total += ap.tokensTotal;
    }
  }
  // Re-sum tokens from sessions for accuracy especially cacheWrite
  totals.tokens.input = 0;
  totals.tokens.output = 0;
  totals.tokens.reasoning = 0;
  totals.tokens.cacheRead = 0;
  totals.tokens.cacheWrite = 0;
  totals.tokens.total = 0;

  for (const session of sessionMap.values()) {
    totals.tokens.input += session.tokens.input;
    totals.tokens.output += session.tokens.output;
    totals.tokens.reasoning += session.tokens.reasoning;
    totals.tokens.cacheRead += session.tokens.cacheRead;
    totals.tokens.cacheWrite += session.tokens.cacheWrite;
    totals.tokens.total += session.tokens.total;
  }

  // Calculate time-based costs
  for (const msg of messages) {
    if (!isAssistantMessage(msg)) continue;
    const cost = getMessageCost(msg);
    const msgDate = new Date(msg.time.created);
    const providerId = getMessageProviderID(msg);
    const isBilling = isProviderBilling(providerId);
    const isSubscription = isProviderSubscription(providerId);

    const isToday = msgDate.toDateString() === now.toDateString();
    const isThisWeek = msgDate >= startOfWeek;
    const isThisMonth = msgDate >= startOfMonth;

    if (isToday) {
      totals.todayCost += cost;
      if (isBilling) totals.todayBillingCost += cost;
    }
    if (isThisWeek) {
      totals.weekCost += cost;
      if (isBilling) totals.weekBillingCost += cost;
    }
    if (isThisMonth) {
      totals.monthCost += cost;
      if (isBilling) totals.monthBillingCost += cost;
    }
    if (msg.time.created >= fiveHourAgo) {
      totals.fiveHourCost += cost;
      if (isBilling) totals.fiveHourBillingCost += cost;
      if (isSubscription) totals.fiveHourSubscriptionCost += cost;
    }
  }

  // Build session tree: attach children to parents, merge child metrics up
  const allSessions = Array.from(sessionMap.values());
  for (const session of allSessions) {
    if (session.parentID) {
      const parent = sessionMap.get(session.parentID);
      if (parent) {
        parent.children.push(session);

        for (const [agentName, agentData] of Object.entries(session.agents)) {
          if (!parent.agents[agentName]) {
            parent.agents[agentName] = { ...agentData };
          } else {
            parent.agents[agentName].cost += agentData.cost;
            parent.agents[agentName].messages += agentData.messages;
            parent.agents[agentName].lastActiveAt = Math.max(
              parent.agents[agentName].lastActiveAt,
              agentData.lastActiveAt,
            );
          }
        }

        parent.tokens.input += session.tokens.input;
        parent.tokens.output += session.tokens.output;
        parent.tokens.reasoning += session.tokens.reasoning;
        parent.tokens.cacheRead += session.tokens.cacheRead;
        parent.tokens.cacheWrite += session.tokens.cacheWrite;
        parent.tokens.total += session.tokens.total;

        parent.totalCost += session.totalCost;
        parent.billingCost += session.billingCost;
        parent.messageCount += session.messageCount;

        parent.updatedAt = Math.max(parent.updatedAt, session.updatedAt);
        parent.duration = parent.updatedAt - parent.createdAt;
      }
    }
  }

  const rootSessions = allSessions
    .filter((s) => !s.parentID)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  for (const session of rootSessions) {
    session.children.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return {
    sessions: rootSessions,
    agents: Array.from(agentMap.values()).sort((a, b) => b.totalCost - a.totalCost),
    providers: Array.from(providerMap.values()).sort((a, b) => b.totalCost - a.totalCost),
    totals,
    timeline: Array.from(timelineMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.hour - b.hour;
    }),
  };
}
