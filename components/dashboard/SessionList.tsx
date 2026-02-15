"use client";

import { motion } from "framer-motion";
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
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.12 }}
      className="panel-frame panel-frame-hover relative overflow-hidden rounded-2xl p-6"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl p-px [background:linear-gradient(150deg,rgba(34,211,238,0.48),transparent_42%,rgba(251,191,36,0.42))] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:xor]" />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-50">Latest Sessions</h2>
        <p className="text-xs text-slate-400">Showing {latestSessions.length} recent sessions</p>
      </div>

      <div className="mt-4 divide-y divide-slate-800/70">
        {latestSessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.025, ease: "easeOut" }}
          >
            <Link
              href={`/sessions/${session.id}`}
              className="group block rounded-lg border border-transparent px-3 py-4 transition duration-300 hover:border-cyan-200/35 hover:bg-cyan-200/[0.05]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-100 transition-colors group-hover:text-cyan-100">
                    {session.title || session.slug}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">{session.directory}</p>
                </div>
                <div className="flex flex-wrap gap-5 text-xs text-slate-300/90">
                  {session.billingCost > 0 && (
                    <span className="font-mono text-slate-100">{formatCost(session.billingCost)}</span>
                  )}
                  <span className="font-mono">{formatNumber(session.messageCount)} msgs</span>
                  <span className="font-mono">{formatDuration(session.duration)}</span>
                  <span>{formatDateTime(session.updatedAt)}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
