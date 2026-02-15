interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <p className="text-4xl">🛰️</p>
      <h2 className="mt-4 text-xl font-semibold text-slate-100">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{description}</p>
    </div>
  );
}
