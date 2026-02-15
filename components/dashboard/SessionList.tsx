"use client";

import { useState } from "react";
import Link from "next/link";
import { AGENT_META } from "@/lib/constants";
import type { SessionSummary } from "@/lib/types";
import { formatCost, formatDateTime, formatDuration, formatNumber } from "@/lib/utils";

interface SessionListProps {
  sessions: SessionSummary[];
}

function extractSubagentLabel(title: string): string | null {
  const match = title.match(/@(\S+)\s+subagent/i);
  return match ? match[1] : null;
}

function SessionRow({ session, isChild = false }: { session: SessionSummary; isChild?: boolean }) {
  const isRecent = Date.now() - session.updatedAt < 3_600_000;
  const subagentType = isChild ? extractSubagentLabel(session.title) : null;
  const agentMeta = subagentType ? AGENT_META[subagentType] : null;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className={`group block rounded-lg border border-transparent px-4 py-3 transition-all hover:border-slate-800/60 hover:bg-slate-800/30 ${
        isChild ? "ml-6 border-l-2 !border-l-slate-800/40 py-2" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isRecent && !isChild && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            )}
            {isChild && agentMeta && (
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800/60 text-[10px] ring-1 ring-white/5">
                {agentMeta.emoji}
              </span>
            )}
            {isChild && !agentMeta && (
              <span className="text-[10px] text-slate-600">{"\u2514"}</span>
            )}
            <p className={`truncate transition-colors group-hover:text-white ${
              isChild ? "text-sm text-slate-400" : "font-medium text-slate-100"
            }`}>
              {isChild && agentMeta ? agentMeta.label : (session.title || session.slug)}
            </p>
            {isChild && agentMeta && (
              <span className="rounded-full bg-slate-800/40 px-1.5 py-0.5 text-[10px] text-slate-500">
                {agentMeta.role}
              </span>
            )}
          </div>
          {!isChild && (
            <p className="mt-1 truncate text-xs text-slate-500">{session.directory}</p>
          )}
        </div>
        <div className={`flex flex-wrap items-center gap-4 text-xs text-slate-400 ${isChild ? "gap-3 text-[11px]" : ""}`}>
          {session.billingCost > 0 && (
            <span className={`rounded-md bg-slate-800/50 px-2 py-0.5 font-mono font-medium ${isChild ? "text-slate-400" : "text-slate-200"}`}>
              {formatCost(session.billingCost)}
            </span>
          )}
          <span className="font-mono">{formatNumber(session.messageCount)} msgs</span>
          {!isChild && <span className="font-mono">{formatDuration(session.duration)}</span>}
          <span className="text-slate-500">{formatDateTime(session.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function SessionList({ sessions }: SessionListProps) {
  const latestSessions = [...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20);

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleExpand = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Latest Sessions</h2>
        <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
          {latestSessions.length} recent
        </span>
      </div>

      <div className="mt-4 space-y-0.5">
        {latestSessions.map((session) => {
          const hasChildren = session.children.length > 0;
          const isExpanded = expandedSessions.has(session.id);

          return (
            <div key={session.id}>
              <div className="flex items-center">
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(session.id)}
                    className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-300"
                  >
                    {isExpanded ? "\u25BE" : "\u25B8"}
                  </button>
                )}
                {!hasChildren && <div className="mr-1 w-6" />}
                <div className="min-w-0 flex-1">
                  <SessionRow session={session} />
                </div>
              </div>

              {hasChildren && (
                <div className="flex items-center gap-1 pl-7">
                  <button
                    type="button"
                    onClick={() => toggleExpand(session.id)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-slate-800/40 hover:text-slate-400"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-800/60 text-[9px] ring-1 ring-white/5">
                      {session.children.length}
                    </span>
                    subagent session{session.children.length !== 1 ? "s" : ""}
                    <span className="text-[10px]">{isExpanded ? "\u25B4" : "\u25BE"}</span>
                  </button>
                </div>
              )}

              {hasChildren && isExpanded && (
                <div className="space-y-0.5 pb-2">
                  {session.children.map((child) => (
                    <SessionRow key={child.id} session={child} isChild />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
