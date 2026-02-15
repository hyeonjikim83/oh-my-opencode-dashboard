export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <div className="h-4 w-28 rounded bg-slate-800" />
            <div className="mt-4 h-8 w-36 rounded bg-slate-800" />
            <div className="mt-3 h-3 w-24 rounded bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="h-5 w-44 rounded bg-slate-800" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 rounded bg-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
