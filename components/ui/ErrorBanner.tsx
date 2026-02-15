interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3.5 text-sm backdrop-blur-sm">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs">
        ⚠
      </span>
      <div>
        <span className="font-semibold text-amber-300">Warning</span>
        <p className="mt-0.5 text-amber-200/80">{message}</p>
      </div>
    </div>
  );
}
