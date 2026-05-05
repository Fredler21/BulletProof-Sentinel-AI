import Link from "next/link";

export default function HomePage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-sentinel-accent">
          Bulletproof Sentinel AI
        </p>
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">
          Autonomous AI Cyber Defense Copilot
        </h1>
        <p className="mt-5 text-base text-sentinel-muted">
          Monitor infrastructure, deploy honeypots, log security events, and
          triage threats from a single intelligent operations console.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-sentinel-accent px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-cyan-300"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-sentinel-border px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-sentinel-panel"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
