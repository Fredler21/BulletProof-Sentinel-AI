import { headers } from "next/headers";
import { triggerTrap } from "@/lib/server/honeypots";

export const dynamic = "force-dynamic";


export default async function WpLoginHoneypot(): Promise<React.ReactElement> {
  const h = await headers();
  await triggerTrap("/honeypot/wp-login", {
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent"),
    method: "GET",
  });
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16 text-slate-900">
      <div className="w-full max-w-sm rounded border border-slate-200 bg-white p-6 shadow">
        <h1 className="text-center text-lg font-semibold">WordPress</h1>
        <form className="mt-5 space-y-3" action="#" method="post">
          <input
            type="text"
            placeholder="Username or Email"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
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
