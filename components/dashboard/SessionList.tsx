import Link from "next/link";
import type { SessionSummary } from "@/lib/types";
import { formatCost, formatDateTime, formatDuration, formatNumber } from "@/lib/utils";

interface SessionListProps {
  sessions: SessionSummary[];
}

export function SessionList({ sessions }: SessionListProps) {
  const latestSessions = [...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Latest Sessions</h2>
        <p className="text-xs text-slate-500">Showing {latestSessions.length} recent sessions</p>
      </div>

      <div className="mt-4 divide-y divide-slate-800">
        {latestSessions.map((session) => (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="block rounded-lg px-3 py-4 transition hover:bg-slate-800/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-100">{session.title || session.slug}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{session.directory}</p>
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-slate-400">
                {session.billingCost > 0 && (
                  <span className="font-mono text-slate-100">{formatCost(session.billingCost)}</span>
                )}
                <span className="font-mono">{formatNumber(session.messageCount)} msgs</span>
                <span className="font-mono">{formatDuration(session.duration)}</span>
                <span>{formatDateTime(session.updatedAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
