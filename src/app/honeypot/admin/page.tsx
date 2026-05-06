import { headers } from "next/headers";
import { triggerTrap } from "@/lib/server/honeypots";
import { isIpBlocked } from "@/lib/server/blocklist";
import { pickTaunt } from "@/lib/server/honeypotTaunts";

export const dynamic = "force-dynamic";

function clientIp(h: Headers): string | null {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

function BlockedScreen(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-200">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-white">403 — Access Denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your IP address has been blocked by Sentinel AI for suspicious activity.
        </p>
      </div>
    </main>
  );
}

export default async function HoneypotAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}): Promise<React.ReactElement> {
  const h = await headers();
  const ip = clientIp(h);
  const sp = await searchParams;
  if (await isIpBlocked(ip)) return <BlockedScreen />;

  await triggerTrap("/honeypot/admin", {
    ip,
    userAgent: h.get("user-agent"),
    method: "GET",
  });
  const taunt = pickTaunt(ip);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-200">
      {/*
        ───────────────────────────────────────────────
         Hi there, source-viewer. 👋
         Yes, we knew you'd Ctrl+U. We always do.
         This is a Sentinel AI honeypot. The 'admin'
         account here has the password 'youAreOnCamera'.
         (It does not work. Nothing here works. That's the point.)
         Suggested next steps:
           1. Close the tab.
           2. Touch grass. 🌱
           3. Apply to our security team — we're hiring.
        ───────────────────────────────────────────────
      */}
      <div className="w-full max-w-sm rounded-md border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-lg font-semibold text-white">Admin Console</h1>
        <p className="mt-1 text-xs text-slate-400">Restricted access.</p>
        {sp?.err && (
          <>
            <div className="mt-3 rounded border border-red-700/40 bg-red-900/30 px-3 py-2 text-xs text-red-300">
              Invalid credentials.
            </div>
            <div className="mt-2 rounded border border-amber-600/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
              {taunt}
            </div>
          </>
        )}
        <form className="mt-5 space-y-3" action="/api/honeypot/admin" method="post">
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
