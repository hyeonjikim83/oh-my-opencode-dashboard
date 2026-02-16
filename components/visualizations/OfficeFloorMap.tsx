"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
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

const LIGHT_ROOM_THEMES = [
  { wall: "#F5F0E8", floor: "#E8D5B5", border: "#D4C4A8", dot: "#F59E0B" },
  { wall: "#FFF8F0", floor: "#DEC9A8", border: "#DCC8AA", dot: "#3B82F6" },
  { wall: "#F6EFE3", floor: "#F0E0C8", border: "#D7C6AA", dot: "#22C55E" },
  { wall: "#FBF3E8", floor: "#E5D2B2", border: "#D6C1A2", dot: "#A855F7" },
  { wall: "#F8EFE2", floor: "#DCC3A0", border: "#CFAF8D", dot: "#F97316" },
  { wall: "#FFF6EA", floor: "#E7D2B4", border: "#D6C1A5", dot: "#EC4899" },
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
  const empty = null;
  const w = "#FFFFFF";
  return [
    [empty, a, a, a, empty],
    [a, h, h, h, a],
    [h, w, h, w, h],
    [empty, h, h, h, empty],
    [d, b, b, b, d],
    [empty, b, b, b, empty],
    [empty, d, empty, d, empty],
    [empty, d, empty, d, empty],
  ];
}

function spritePlant(): (string | null)[][] {
  const empty = null;
  const g = "#22C55E", k = "#15803D", p = "#713F12";
  return [
    [empty, empty, g, empty, empty],
    [empty, g, k, g, empty],
    [g, k, g, k, g],
    [empty, g, k, g, empty],
    [empty, empty, p, empty, empty],
    [empty, p, p, p, empty],
  ];
}

function spriteDesk(): (string | null)[][] {
  const empty = null;
  const w = "#92400E", d = "#78350F";
  return [
    [w, w, w, w, w, w, w, w, w],
    [d, d, d, d, d, d, d, d, d],
    [d, empty, empty, empty, empty, empty, empty, empty, d],
    [d, empty, empty, empty, empty, empty, empty, empty, d],
  ];
}

function spriteShelf(): (string | null)[][] {
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
  const empty = null;
  const f = "#64748B", s = "#38BDF8", d = "#475569";
  return [
    [f, f, f, f, f],
    [f, s, s, s, f],
    [f, s, s, s, f],
    [f, f, f, f, f],
    [empty, empty, d, empty, empty],
    [empty, d, d, d, empty],
  ];
}

function spriteCouch(): (string | null)[][] {
  const empty = null;
  const c = "#7C3AED", d = "#5B21B6", a = "#A78BFA";
  return [
    [a, c, c, c, c, c, c, c, a],
    [a, c, c, c, c, c, c, c, a],
    [d, d, d, d, d, d, d, d, d],
    [empty, d, empty, empty, empty, empty, empty, d, empty],
  ];
}

function spriteVending(): (string | null)[][] {
  const empty = null;
  const f = "#64748B", d = "#475569", r = "#EF4444", y = "#EAB308", b = "#3B82F6";
  return [
    [f, f, f, f, f],
    [f, d, d, d, f],
    [f, r, y, b, f],
    [f, y, b, r, f],
    [f, d, d, d, f],
    [f, empty, f, empty, f],
    [f, f, f, f, f],
    [d, empty, empty, empty, d],
  ];
}

function spriteWhiteboard(): (string | null)[][] {
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
  const empty = null;
  const w = "#92400E", d = "#78350F";
  return [
    [w, w, w, w, w, w, w, w, w, w],
    [d, d, d, d, d, d, d, d, d, d],
    [d, empty, empty, empty, empty, empty, empty, empty, empty, d],
  ];
}

function agentActivity(
  agentName: string,
  lastActiveAt: number,
  now: number,
  theme: "light" | "dark",
): { text: string; color: string } {
  const light = theme === "light";
  if (agentName === "sisyphus") {
    const ago = now - lastActiveAt;
    if (ago < AGENT_WORKING_MS) return { text: "delegating", color: light ? "#B45309" : "#F59E0B" };
    if (ago < AGENT_RECENT_MS) return { text: "thinking", color: light ? "#92400E" : "#D97706" };
    return { text: "idle", color: light ? "#78716C" : "#64748B" };
  }
  const ago = now - lastActiveAt;
  if (ago < AGENT_WORKING_MS) return { text: "working", color: light ? "#15803D" : "#22C55E" };
  if (ago < AGENT_RECENT_MS) return { text: "paused", color: light ? "#A16207" : "#FBBF24" };
  return { text: "idle", color: light ? "#78716C" : "#64748B" };
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
  theme,
}: {
  name: string;
  lastActiveAt: number;
  provider: string;
  model: string;
  now: number;
  delay: number;
  theme: "light" | "dark";
}) {
  const meta = AGENT_META[name] ?? { label: name, emoji: "?", role: "" };
  const st = agentActivity(name, lastActiveAt, now, theme);
  const idle = st.text === "idle";
  const provIcon = resolveProviderIcon(provider);
  const modelLabel = resolveModelLabel(provider, model);
  const shortModel = modelLabel.length > 14 ? modelLabel.slice(0, 12) + ".." : modelLabel;
  const subtextColor = theme === "light" ? "#78716C" : "#64748B";
  const labelColor = theme === "light" ? "#44403C" : "#CBD5E1";

  return (
    <motion.div
      className="flex flex-col items-center gap-0.5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      style={{ opacity: idle ? 0.5 : 1 }}
    >
      <span className="text-[9px]" style={{ color: subtextColor }}>
        {provIcon} {shortModel}
      </span>
      <span className="text-[10px]" style={{ color: subtextColor }}>
        {idle ? "zzZ" : "\u00B7\u00B7\u00B7"}
      </span>
      <Px g={charGrid(name)} c={5} />
      <span className="mt-0.5 text-[10px] font-bold" style={{ color: labelColor }}>
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
  theme,
  now,
}: {
  session: SessionSummary;
  themeIndex: number;
  theme: "light" | "dark";
  now: number;
}) {
  const roomThemes = theme === "light" ? LIGHT_ROOM_THEMES : ROOM_THEMES;
  const t = roomThemes[themeIndex % roomThemes.length];
  const furniture = FURNITURE_SETS[themeIndex % FURNITURE_SETS.length];
  const agentEntries = Object.entries(session.agents)
    .filter(([n]) => n !== "unknown")
    .sort((a, b) => b[1].lastActiveAt - a[1].lastActiveAt);
  const roomLabel = session.title || session.slug;
  const truncated = roomLabel.length > 28 ? roomLabel.slice(0, 26) + ".." : roomLabel;
  const roomTitleColor = theme === "light" ? "#5A4630" : "#E2E8F0";
  const metaColor = theme === "light" ? "#7C6650" : "#64748B";
  const emptyColor = theme === "light" ? "#8B7355" : "#334155";
  const furnitureBorderColor = theme === "light" ? "rgba(124, 102, 80, 0.25)" : "rgba(255, 255, 255, 0.05)";
  const footerTextColor = theme === "light" ? "#725B44" : "#475569";

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg"
      style={{ border: `1px solid ${t.border}` }}
    >
      <div className="flex items-baseline justify-between gap-2 px-3 py-1.5" style={{ background: t.wall }}>
        <span className="min-w-0 truncate text-xs font-bold">
          <span style={{ color: t.dot }}>{"\u25A0"} </span>
          <span style={{ color: roomTitleColor }}>{truncated}</span>
        </span>
        <span className="shrink-0 text-[10px]" style={{ color: metaColor }}>
          {formatRelativeTime(session.updatedAt)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3" style={{ background: t.floor, minHeight: 170 }}>
        <div className="mb-3 flex min-h-[90px] flex-1 flex-wrap items-end justify-center gap-4">
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
                theme={theme}
              />
            ))
          ) : (
            <span className="text-[10px] italic" style={{ color: emptyColor }}>
              empty
            </span>
          )}
        </div>

        <div className="flex items-end justify-around gap-3 border-t pt-2" style={{ borderColor: furnitureBorderColor }}>
          {furniture.sprites.map((fn, i) => (
            <Px key={i} g={fn()} c={furniture.sizes[i]} />
          ))}
        </div>
      </div>

      <div
        className="flex items-center justify-between px-3 py-1 text-[9px]"
        style={{ background: t.wall, color: footerTextColor }}
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
  const { theme } = useTheme();
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
    <section className="rounded-xl border border-slate-800/60 bg-slate-950/90 p-4 font-mono backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800/60 text-xs ring-1 ring-white/5">☰</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Office Floor Map
          </span>
        </div>
        <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
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
                    theme={theme}
                    now={now}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/40 px-1 pt-3 text-[11px] text-slate-500">
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
