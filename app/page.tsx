import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { EmptyState } from "@/components/ui/EmptyState";
import { aggregateDashboardData } from "@/lib/data/aggregator";
import { fetchCodexUsage } from "@/lib/data/codex-usage";
import { readAllMessages, readAllSessions } from "@/lib/data/reader";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [sessions, messages, codexUsage] = await Promise.all([
    readAllSessions(),
    readAllMessages(),
    fetchCodexUsage(),
  ]);

  if (sessions.length === 0 && messages.length === 0) {
    return (
      <EmptyState
        title="No OpenCode sessions yet"
        description="Start a session in OpenCode and come back to see real-time usage analytics."
      />
    );
  }

  const data = aggregateDashboardData(sessions, messages);
  data.codexUsage = codexUsage;

  return <DashboardContent data={data} />;
}
