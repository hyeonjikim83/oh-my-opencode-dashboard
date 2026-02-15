export function formatCost(cost: number): string {
  if (cost >= 100) return `$${cost.toFixed(0)}`;
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  if (cost === 0) return "$0.00";
  return `$${cost.toFixed(4)}`;
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 10_000) return `${(count / 1_000).toFixed(1)}K`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(2)}K`;
  return count.toLocaleString();
}

export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-CA");
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.toLocaleDateString("en-CA")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return formatDate(timestamp);
}

export function formatResetCountdown(resetAfterSeconds: number): string {
  if (resetAfterSeconds <= 0) return "now";
  const d = Math.floor(resetAfterSeconds / 86400);
  const h = Math.floor((resetAfterSeconds % 86400) / 3600);
  const m = Math.floor((resetAfterSeconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatResetTime(resetAtEpochSeconds: number): string {
  const d = new Date(resetAtEpochSeconds * 1000);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (diffDays <= 0) return time;
  if (diffDays === 1) return `tomorrow ${time}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday} ${time}`;
}

export function formatWindowLabel(windowSeconds: number): string {
  const hours = windowSeconds / 3600;
  if (hours >= 168) return "Weekly";
  if (hours >= 24) return `${Math.round(hours / 24)}d`;
  return `${Math.round(hours)}h`;
}
