"use client";

import { AgentTable } from "@/components/dashboard/AgentTable";
import { ProviderBreakdown } from "@/components/dashboard/ProviderBreakdown";
import { SessionList } from "@/components/dashboard/SessionList";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { OfficeFloorMap } from "@/components/visualizations/OfficeFloorMap";
import type { DashboardData } from "@/lib/types";

interface DashboardContentProps {
  data: DashboardData;
}

export function DashboardContent({ data }: DashboardContentProps) {
  return (
    <div className="space-y-6">
      <OfficeFloorMap sessions={data.sessions} totals={data.totals} />

      <SummaryCards totals={data.totals} />

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />
      </div>

      <ProviderBreakdown providers={data.providers} />
      <AgentTable agents={data.agents} />
      <SessionList sessions={data.sessions} />
    </div>
  );
}
