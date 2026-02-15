interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-14 text-center backdrop-blur-sm">
      <div className="animate-float text-5xl">🛰️</div>
      <h2 className="mt-6 text-xl font-semibold text-slate-100">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">{description}</p>
      <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
    </div>
  );
}
