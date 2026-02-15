"use client";

import { motion } from "framer-motion";
import { AGENT_META, PROVIDER_MAP, PASTEL_PALETTE } from "@/lib/constants";
import type { AgentSummary } from "@/lib/types";
import { formatNumber, formatPercent, formatTokens } from "@/lib/utils";
import { useState } from "react";

interface AgentBubblesProps {
  agents: AgentSummary[];
}

export function AgentBubbles({ agents }: AgentBubblesProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const sorted = [...agents]
    .filter((a) => a.agent !== "unknown" && a.messageCount > 0)
    .sort((a, b) => b.messageCount - a.messageCount);

  if (sorted.length === 0) return null;

  const maxMsg = sorted[0].messageCount;
  const minSize = 56;
  const maxSize = 140;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Agent Activity</h2>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {sorted.map((agent, i) => {
          const meta = AGENT_META[agent.agent] ?? { emoji: "?", label: agent.agent, role: "" };
          const provColor = PROVIDER_MAP[agent.providers[0]]?.color ?? PASTEL_PALETTE[i % PASTEL_PALETTE.length];
          const ratio = Math.sqrt(agent.messageCount / maxMsg);
          const size = minSize + ratio * (maxSize - minSize);
          const isHovered = hovered === agent.agent;

          return (
            <motion.div
              key={agent.agent}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.05 }}
              onMouseEnter={() => setHovered(agent.agent)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex flex-col items-center justify-center rounded-full border-2 transition-shadow duration-200"
              style={{
                width: size,
                height: size,
                borderColor: provColor,
                backgroundColor: `${provColor}15`,
                boxShadow: isHovered ? `0 0 24px ${provColor}40` : "none",
              }}
            >
              <span className="text-xl leading-none">{meta.emoji}</span>
              <span className="mt-0.5 text-[10px] font-medium text-slate-300">{meta.label}</span>
              <span className="font-mono text-[9px] text-slate-500">{formatNumber(agent.messageCount)}</span>

              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-20 z-10 w-44 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs shadow-xl"
                >
                  <p className="font-medium text-slate-200">{meta.label}</p>
                  <p className="mt-1 text-slate-400">
                    {formatNumber(agent.messageCount)} msgs · {formatTokens(agent.totalTokensIn + agent.totalTokensOut)} tokens
                  </p>
                  <p className="text-slate-500">Cache {formatPercent(agent.cacheHitRate)}</p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
