import { aggregateDashboardData } from "@/lib/data/aggregator";
import { fetchCodexUsage } from "@/lib/data/codex-usage";
import { readAllMessages, readAllSessions } from "@/lib/data/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sessions, messages, codexUsage] = await Promise.all([
    readAllSessions(),
    readAllMessages(),
    fetchCodexUsage(),
  ]);
  const data = aggregateDashboardData(sessions, messages);
  data.codexUsage = codexUsage;
  return Response.json(data);
}
