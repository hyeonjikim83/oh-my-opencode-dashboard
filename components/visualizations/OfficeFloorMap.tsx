"use client";

import { motion } from "framer-motion";
import { AGENT_META, PROVIDER_MAP } from "@/lib/constants";
import type { SessionSummary, DashboardData } from "@/lib/types";
import { formatTokens, formatNumber, formatRelativeTime } from "@/lib/utils";

const MAX_ROOMS = 6;
const SESSION_ACTIVE_MS = 15 * 60 * 1000;
const AGENT_WORKING_MS = 5 * 60 * 1000;
const AGENT_RECENT_MS = 15 * 60 * 1000;

const PAL: Record<string, [hair: string, body: string, dark: string, accent: string]> = {
  sisyphus: ["#F59E0B", "#D97706", "#92400E", "#FCD34D"],
  hephaestus: ["#EF4444", "#DC2626", "#991B1B", "#FCA5A5"],
  prometheus: ["#EAB308", "#CA8A04", "#854D0E", "#FDE68A"],
  librarian: ["#A855F7", "#9333EA", "#6B21A8", "#D8B4FE"],
  explore: ["#22C55E", "#16A34A", "#166534", "#86EFAC"],
  oracle: ["#3B82F6", "#2563EB", "#1E3A8A", "#93C5FD"],
  metis: ["#14B8A6", "#0D9488", "#134E4A", "#5EEAD4"],
  momus: ["#EC4899", "#DB2777", "#9D174D", "#F9A8D4"],
  atlas: ["#6366F1", "#4F46E5", "#3730A3", "#A5B4FC"],
  "multimodal-looker": ["#06B6D4", "#0891B2", "#155E75", "#67E8F9"],
};

const ROOM_THEMES = [
  { wall: "#0E2233", floor: "#132B3D", border: "#1B3A50", dot: "#F59E0B" },
  { wall: "#0E2038", floor: "#13293D", border: "#1B3550", dot: "#3B82F6" },
  { wall: "#0E2D28", floor: "#133530", border: "#1B4A42", dot: "#22C55E" },
  { wall: "#22102E", floor: "#2A1538", border: "#3D1B50", dot: "#A855F7" },
  { wall: "#1E1710", floor: "#2A2018", border: "#4A3828", dot: "#F97316" },
  { wall: "#0E1A28", floor: "#132230", border: "#1B3248", dot: "#EC4899" },
];

type FurnitureSet = { sprites: (() => (string | null)[][])[]; sizes: number[] };

const FURNITURE_SETS: FurnitureSet[] = [
  { sprites: [spritePlant, spriteDesk, spriteShelf], sizes: [5, 4, 4] },
  { sprites: [spriteComputer, spriteComputer, spriteDesk], sizes: [4, 4, 4] },
  { sprites: [spriteWhiteboard, spriteTable, spritePlant], sizes: [4, 4, 5] },
  { sprites: [spriteCouch, spriteVending], sizes: [4, 4] },
  { sprites: [spritePlant, spriteComputer, spriteShelf], sizes: [5, 4, 4] },
  { sprites: [spriteTable, spriteComputer, spritePlant], sizes: [4, 4, 5] },
];

function Px({ g, c = 4 }: { g: (string | null)[][]; c?: number }) {
  return (
    <div className="inline-flex flex-col" style={{ imageRendering: "pixelated" }}>
      {g.map((row, y) => (
        <div key={y} className="flex">
          {row.map((color, x) => (
            <div
              key={x}
              style={{ width: c, height: c, background: color ?? "transparent" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function charGrid(name: string): (string | null)[][] {
  const [h, b, d, a] = PAL[name] ?? ["#94A3B8", "#64748B", "#475569", "#CBD5E1"];
  const _ = null;
  const w = "#FFFFFF";
  return [
    [_, a, a, a, _],
    [a, h, h, h, a],
    [h, w, h, w, h],
    [_, h, h, h, _],
    [d, b, b, b, d],
    [_, b, b, b, _],
    [_, d, _, d, _],
    [_, d, _, d, _],
  ];
}

function spritePlant(): (string | null)[][] {
  const _ = null;
  const g = "#22C55E", k = "#15803D", p = "#713F12";
  return [
    [_, _, g, _, _],
    [_, g, k, g, _],
    [g, k, g, k, g],
    [_, g, k, g, _],
    [_, _, p, _, _],
    [_, p, p, p, _],
  ];
}

function spriteDesk(): (string | null)[][] {
  const _ = null;
  const w = "#92400E", d = "#78350F";
  return [
    [w, w, w, w, w, w, w, w, w],
    [d, d, d, d, d, d, d, d, d],
    [d, _, _, _, _, _, _, _, d],
    [d, _, _, _, _, _, _, _, d],
  ];
}

function spriteShelf(): (string | null)[][] {
  const _ = null;
  const f = "#78350F", r = "#EF4444", b = "#3B82F6", g = "#22C55E", y = "#EAB308";
  return [
    [f, f, f, f, f, f],
    [f, r, b, g, y, f],
    [f, f, f, f, f, f],
    [f, g, y, r, b, f],
    [f, f, f, f, f, f],
    [f, b, r, y, g, f],
    [f, f, f, f, f, f],
  ];
}

function spriteComputer(): (string | null)[][] {
  const _ = null;
  const f = "#64748B", s = "#38BDF8", d = "#475569";
  return [
    [f, f, f, f, f],
    [f, s, s, s, f],
    [f, s, s, s, f],
    [f, f, f, f, f],
    [_, _, d, _, _],
    [_, d, d, d, _],
  ];
}

function spriteCouch(): (string | null)[][] {
  const _ = null;
  const c = "#7C3AED", d = "#5B21B6", a = "#A78BFA";
  return [
    [a, c, c, c, c, c, c, c, a],
    [a, c, c, c, c, c, c, c, a],
    [d, d, d, d, d, d, d, d, d],
    [_, d, _, _, _, _, _, d, _],
  ];
}

function spriteVending(): (string | null)[][] {
  const _ = null;
  const f = "#64748B", d = "#475569", r = "#EF4444", y = "#EAB308", b = "#3B82F6";
  return [
    [f, f, f, f, f],
    [f, d, d, d, f],
    [f, r, y, b, f],
    [f, y, b, r, f],
    [f, d, d, d, f],
    [f, _, f, _, f],
    [f, f, f, f, f],
    [d, _, _, _, d],
  ];
}

function spriteWhiteboard(): (string | null)[][] {
  const _ = null;
  const f = "#94A3B8", w = "#E2E8F0", m = "#EF4444";
  return [
    [f, f, f, f, f, f, f],
    [f, w, w, w, w, w, f],
    [f, w, m, w, m, w, f],
    [f, w, w, m, w, w, f],
    [f, w, w, w, w, w, f],
    [f, f, f, f, f, f, f],
  ];
}

function spriteTable(): (string | null)[][] {
  const _ = null;
  const w = "#92400E", d = "#78350F";
  return [
    [w, w, w, w, w, w, w, w, w, w],
    [d, d, d, d, d, d, d, d, d, d],
    [d, _, _, _, _, _, _, _, _, d],
  ];
}

function agentActivity(
  agentName: string,
  lastActiveAt: number,
  now: number,
): { text: string; color: string } {
  if (agentName === "sisyphus") {
    const ago = now - lastActiveAt;
    if (ago < AGENT_WORKING_MS) return { text: "delegating", color: "#F59E0B" };
    if (ago < AGENT_RECENT_MS) return { text: "thinking", color: "#D97706" };
    return { text: "idle", color: "#64748B" };
  }
  const ago = now - lastActiveAt;
  if (ago < AGENT_WORKING_MS) return { text: "working", color: "#22C55E" };
  if (ago < AGENT_RECENT_MS) return { text: "paused", color: "#FBBF24" };
  return { text: "idle", color: "#64748B" };
}

function resolveModelLabel(provider: string, model: string): string {
  const providerMeta = PROVIDER_MAP[provider];
  if (!providerMeta) return model;
  const modelMeta = providerMeta.models?.[model];
  return modelMeta?.name ?? model;
}

function resolveProviderIcon(provider: string): string {
  return PROVIDER_MAP[provider]?.icon ?? "";
}

function AgentChar({
  name,
  lastActiveAt,
  provider,
  model,
  now,
  delay,
}: {
  name: string;
  lastActiveAt: number;
  provider: string;
  model: string;
  now: number;
  delay: number;
}) {
  const meta = AGENT_META[name] ?? { label: name, emoji: "?", role: "" };
  const st = agentActivity(name, lastActiveAt, now);
  const idle = st.text === "idle";
  const provIcon = resolveProviderIcon(provider);
  const modelLabel = resolveModelLabel(provider, model);
  const shortModel = modelLabel.length > 14 ? modelLabel.slice(0, 12) + ".." : modelLabel;

  return (
    <motion.div
      className="flex flex-col items-center gap-0.5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      style={{ opacity: idle ? 0.5 : 1 }}
    >
      <span className="text-[9px] text-slate-500">
        {provIcon} {shortModel}
      </span>
      <span className="text-[10px] text-slate-500">
        {idle ? "zzZ" : "\u00B7\u00B7\u00B7"}
      </span>
      <Px g={charGrid(name)} c={5} />
      <span className="mt-0.5 text-[10px] font-bold text-slate-300">
        {meta.label}
      </span>
      <span className="flex items-center gap-0.5 text-[9px]">
        <span style={{ color: st.color }}>{"\u25A0"}</span>
        <span style={{ color: st.color }}>{st.text}</span>
      </span>
    </motion.div>
  );
}

function SessionRoom({
  session,
  themeIndex,
  now,
}: {
  session: SessionSummary;
  themeIndex: number;
  now: number;
}) {
  const t = ROOM_THEMES[themeIndex % ROOM_THEMES.length];
  const furniture = FURNITURE_SETS[themeIndex % FURNITURE_SETS.length];
  const agentEntries = Object.entries(session.agents)
    .filter(([n]) => n !== "unknown")
    .sort((a, b) => b[1].lastActiveAt - a[1].lastActiveAt);
  const roomLabel = session.title || session.slug;
  const truncated = roomLabel.length > 28 ? roomLabel.slice(0, 26) + ".." : roomLabel;

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{ border: `1px solid ${t.border}` }}
    >
      <div className="flex items-baseline justify-between gap-2 px-3 py-1.5" style={{ background: t.wall }}>
        <span className="min-w-0 truncate text-xs font-bold">
          <span style={{ color: t.dot }}>{"\u25A0"} </span>
          <span className="text-slate-200">{truncated}</span>
        </span>
        <span className="shrink-0 text-[10px] text-slate-500">
          {formatRelativeTime(session.updatedAt)}
        </span>
      </div>

      <div className="p-3" style={{ background: t.floor, minHeight: 170 }}>
        <div className="mb-3 flex min-h-[90px] flex-wrap items-end justify-center gap-4">
          {agentEntries.length > 0 ? (
            agentEntries.map(([name, data], i) => (
              <AgentChar
                key={name}
                name={name}
                lastActiveAt={data.lastActiveAt}
                provider={data.provider}
                model={data.model}
                now={now}
                delay={i * 0.08}
              />
            ))
          ) : (
            <span className="text-[10px] italic text-slate-700">empty</span>
          )}
        </div>

        <div className="flex items-end justify-around gap-3 border-t border-white/5 pt-2">
          {furniture.sprites.map((fn, i) => (
            <Px key={i} g={fn()} c={furniture.sizes[i]} />
          ))}
        </div>
      </div>

      <div
        className="flex items-center justify-between px-3 py-1 text-[9px] text-slate-600"
        style={{ background: t.wall }}
      >
        <span>{formatNumber(session.messageCount)} msg</span>
        <span>{formatTokens(session.tokens.total)} tok</span>
        <span>{agentEntries.length} agents</span>
      </div>
    </div>
  );
}

interface OfficeFloorMapProps {
  sessions: SessionSummary[];
  totals: DashboardData["totals"];
}

export function OfficeFloorMap({ sessions, totals }: OfficeFloorMapProps) {
  const now = Date.now();
  const activeSessions = sessions
    .filter((s) => now - s.updatedAt < SESSION_ACTIVE_MS && s.messageCount > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ROOMS);

  const totalAgents = new Set(
    activeSessions.flatMap((s) => Object.keys(s.agents).filter((n) => n !== "unknown")),
  ).size;
  const totalKnown = Object.keys(AGENT_META).length;
  const pct = totalKnown > 0 ? Math.round((totalAgents / totalKnown) * 100) : 0;

  const topAgent = activeSessions
    .flatMap((s) => Object.entries(s.agents))
    .filter(([n]) => n !== "unknown")
    .sort((a, b) => b[1].lastActiveAt - a[1].lastActiveAt)[0];
  const topMeta = topAgent ? AGENT_META[topAgent[0]] : null;

  const rows: SessionSummary[][] = [];
  for (let i = 0; i < activeSessions.length; i += 2) {
    rows.push(activeSessions.slice(i, i + 2));
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{"\u2610"}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Office Floor Map
          </span>
        </div>
        <span className="text-[10px] text-slate-600">
          {activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {activeSessions.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-xs text-slate-600">
          No active sessions right now
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, ri) => (
            <div key={ri}>
              {ri > 0 && (
                <div className="mb-3 text-center">
                  <span className="text-[11px] tracking-[0.3em] text-slate-700">
                    {"\u2014"} {"\u2014"} {"\u2014"} {"\u2014"} {"\u2014"} {"\u2014"}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {row.map((s, ci) => (
                  <SessionRoom
                    key={s.id}
                    session={s}
                    themeIndex={ri * 2 + ci}
                    now={now}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-1 pt-3 text-[11px] text-slate-500">
        <div>
          <span className="font-bold text-slate-400">TOKEN:</span>{" "}
          <span className="text-slate-300">
            {formatTokens(totals.tokens.total)}
          </span>{" "}
          today
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">AGENTS:</span>{" "}
          <span className="text-slate-300">
            {totalAgents}/{totalKnown}
          </span>{" "}
          ({pct}%)
          <div className="flex h-2 w-14 overflow-hidden rounded-sm bg-slate-800">
            <div
              className="h-full rounded-sm bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div>
          <span className="font-bold text-slate-400">MSG:</span>{" "}
          {topMeta ? (
            <span className="text-slate-300">
              {topMeta.label}{"\u2191"}
            </span>
          ) : (
            <span>{"\u2014"}</span>
          )}
        </div>
      </div>
    </section>
  );
}
