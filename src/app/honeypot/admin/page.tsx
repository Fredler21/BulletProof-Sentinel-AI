import { headers } from "next/headers";
import { triggerTrap } from "@/lib/server/honeypots";

export const dynamic = "force-dynamic";


async function record(path: string): Promise<void> {
  const h = await headers();
  await triggerTrap(path, {
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent"),
    method: "GET",
  });
}

export default async function HoneypotAdminPage(): Promise<React.ReactElement> {
  await record("/honeypot/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-200">
      <div className="w-full max-w-sm rounded-md border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-lg font-semibold text-white">Admin Console</h1>
        <p className="mt-1 text-xs text-slate-400">Restricted access.</p>
        <form className="mt-5 space-y-3" action="#" method="post">
          <input
            type="text"
            placeholder="Username"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="password"
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
