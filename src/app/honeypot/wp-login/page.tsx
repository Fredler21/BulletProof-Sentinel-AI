import { headers } from "next/headers";
import { triggerTrap } from "@/lib/server/honeypots";
import { isIpBlocked } from "@/lib/server/blocklist";

export const dynamic = "force-dynamic";

function clientIp(h: Headers): string | null {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

export default async function HoneypotWpLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}): Promise<React.ReactElement> {
  const h = await headers();
  const ip = clientIp(h);
  const sp = await searchParams;
  if (await isIpBlocked(ip)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-200">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-white">403 — Access Denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your IP address has been blocked.
          </p>
        </div>
      </main>
    );
  }

  await triggerTrap("/honeypot/wp-login", {
    ip,
    userAgent: h.get("user-agent"),
    method: "GET",
  });
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f1f1] px-6 py-16 text-slate-900">
      <div className="w-full max-w-sm rounded-md border border-slate-300 bg-white p-6 shadow">
        <h1 className="text-center text-lg font-semibold">WordPress</h1>
        {sp?.err && (
          <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            <strong>ERROR</strong>: The password you entered is incorrect.
          </div>
        )}
        <form className="mt-5 space-y-3" action="/api/honeypot/wp-login" method="post">
          <input
            type="text"
            name="log"
            placeholder="Username or Email Address"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            type="password"
            name="pwd"
            placeholder="Password"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          >
            Log In
          </button>
        </form>
      </div>
    </main>
  );
}
