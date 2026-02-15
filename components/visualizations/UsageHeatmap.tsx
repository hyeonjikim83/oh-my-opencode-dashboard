"use client";

import { useMemo, useState } from "react";
import type { TimelineEntry } from "@/lib/types";

interface UsageHeatmapProps {
  timeline: TimelineEntry[];
}

export function UsageHeatmap({ timeline }: UsageHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const { grid, dates, maxMsg } = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    for (const entry of timeline) {
      const key = `${entry.date}|${entry.hour}`;
      const prev = map.get(key) ?? 0;
      const next = prev + entry.messages;
      map.set(key, next);
      if (next > max) max = next;
    }

    const today = new Date();
    const dateList: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dateList.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }

    return { grid: map, dates: dateList, maxMsg: max };
  }, [timeline]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const cellSize = 14;
  const gap = 2;

  function intensity(msgs: number): string {
    if (msgs === 0 || maxMsg === 0) return "#1e293b";
    const t = msgs / maxMsg;
    if (t < 0.25) return "#4c1d95";
    if (t < 0.5) return "#6d28d9";
    if (t < 0.75) return "#8b5cf6";
    return "#a78bfa";
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Usage Heatmap</h2>
      <p className="mt-1 text-xs text-slate-500">Messages per hour over the last 30 days</p>

      <div className="mt-4 overflow-x-auto">
        <div className="relative inline-block" onMouseLeave={() => setTooltip(null)}>
          <div className="mb-1 ml-16 flex">
            {hours.filter((h) => h % 3 === 0).map((h) => (
              <span
                key={h}
                className="text-[9px] text-slate-500"
                style={{ width: (cellSize + gap) * 3, flexShrink: 0 }}
              >
                {String(h).padStart(2, "0")}
              </span>
            ))}
          </div>

          {dates.map((date) => (
            <div key={date} className="flex items-center">
              <span className="w-16 shrink-0 text-right pr-2 text-[9px] text-slate-500">
                {date.slice(5)}
              </span>
              <div className="flex" style={{ gap }}>
                {hours.map((hour) => {
                  const key = `${date}|${hour}`;
                  const msgs = grid.get(key) ?? 0;
                  return (
                    <div
                      key={hour}
                      className="rounded-sm transition-colors"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: intensity(msgs),
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                          label: `${date} ${String(hour).padStart(2, "0")}:00 — ${msgs} messages`,
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-3 ml-16 flex items-center gap-1.5 text-[9px] text-slate-500">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <div
                key={t}
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: intensity(t * (maxMsg || 1)) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300 shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          {tooltip.label}
        </div>
      )}
    </section>
  );
}
