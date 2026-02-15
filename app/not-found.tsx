import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
            <div className="space-y-5">
                <div className="animate-float text-6xl">🛸</div>
                <h2 className="text-2xl font-bold text-slate-100">Page Not Found</h2>
                <p className="max-w-md leading-relaxed text-slate-400">
                    We couldn&apos;t find the page you&apos;re looking for. It might have drifted into deep space.
                </p>
                <div className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/80 px-5 py-2.5 text-sm font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-700/80 hover:text-white hover:shadow-lg hover:shadow-slate-900/20"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}
