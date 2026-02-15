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
    <div className="space-y-8">
      <OfficeFloorMap sessions={data.sessions} totals={data.totals} />

      <SummaryCards totals={data.totals} />

      <ProviderBreakdown providers={data.providers} />
      <AgentTable agents={data.agents} />
      <SessionList sessions={data.sessions} />
    </div>
  );
}
