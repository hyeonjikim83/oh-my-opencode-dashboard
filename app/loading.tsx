export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="shimmer h-4 w-24 rounded-md" />
              <div className="shimmer h-8 w-8 rounded-lg" />
            </div>
            <div className="shimmer mt-4 h-9 w-32 rounded-md" />
            <div className="shimmer mt-3 h-3 w-40 rounded-md" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6">
        <div className="shimmer h-5 w-36 rounded-md" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="shimmer h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <div className="shimmer h-4 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/80 p-6">
        <div className="shimmer h-5 w-44 rounded-md" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="shimmer h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
