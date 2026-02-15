"use client";

import { useEffect, useState } from "react";
import { AgentTable } from "@/components/dashboard/AgentTable";
import { ProviderBreakdown } from "@/components/dashboard/ProviderBreakdown";
import { SessionList } from "@/components/dashboard/SessionList";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { OfficeFloorMap } from "@/components/visualizations/OfficeFloorMap";
import type { DashboardData, Period } from "@/lib/types";

interface DashboardContentProps {
  data: DashboardData;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

export function DashboardContent({ data: initialData }: DashboardContentProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    let isMounted = true;

    const fetchFreshData = async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to refresh dashboard data: ${response.status}`);
        }
        const freshData: DashboardData = await response.json();
        if (!isMounted) return;
        setData(freshData);
        setLastRefreshed(Date.now());
      } catch {
      }
    };

    const intervalId = setInterval(fetchFreshData, 30_000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="space-y-6">
      <OfficeFloorMap sessions={data.sessions} totals={data.totals} />

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 rounded-lg bg-slate-800/50 p-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((key) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                period === key
                  ? "bg-slate-700 text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <SummaryCards totals={data.totals} period={period} lastRefreshed={lastRefreshed} />

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />
      </div>

      <ProviderBreakdown providers={data.providers} codexUsage={data.codexUsage} period={period} />
      <AgentTable agents={data.agents} period={period} />
      <SessionList sessions={data.sessions} />
    </div>
  );
}
