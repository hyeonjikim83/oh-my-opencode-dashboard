import type { RawMessage } from "@/lib/types";

export function getMessageAgent(msg: RawMessage): string {
  return msg.agent || msg.mode || "unknown";
}

export function getMessageModelID(msg: RawMessage): string {
  return msg.modelID || msg.model?.modelID || "unknown";
}

export function getMessageProviderID(msg: RawMessage): string {
  return msg.providerID || msg.model?.providerID || "unknown";
}

export function getMessageCost(msg: RawMessage): number {
  return msg.cost ?? 0;
}

export function getMessageTokens(msg: RawMessage) {
  return {
    input: msg.tokens?.input ?? 0,
    output: msg.tokens?.output ?? 0,
    reasoning: msg.tokens?.reasoning ?? 0,
    cacheRead: msg.tokens?.cache?.read ?? 0,
    cacheWrite: msg.tokens?.cache?.write ?? 0,
    total: msg.tokens?.total ?? 0,
  };
}

export function getResponseTime(msg: RawMessage): number {
  if (msg.role !== "assistant" || !msg.time.completed) return 0;
  return msg.time.completed - msg.time.created;
}

export function isAssistantMessage(msg: RawMessage): boolean {
  return msg.role === "assistant" && msg.cost !== undefined;
}
