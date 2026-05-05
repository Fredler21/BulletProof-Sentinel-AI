import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/server/session";
import { LogoutButton } from "@/app/dashboard/_components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-sentinel-border bg-sentinel-panel/60 p-5 md:block">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-sentinel-accent">
            Sentinel AI
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            Security Console
          </p>
        </div>
        <nav className="space-y-1 text-sm">
          <NavLink href="/dashboard" label="Overview" />
          <NavLink href="/dashboard/events" label="Security Events" />
          <NavLink href="/dashboard/scanner" label="Scanner" />
          <NavLink href="/dashboard/honeypots" label="Honeypots" />
          <NavLink href="/dashboard/alerts" label="Alerts" />
          <NavLink href="/dashboard/blocklist" label="Blocklist" />
          <NavLink href="/dashboard/copilot" label="AI Copilot" />
          <NavLink href="/dashboard/reports" label="Reports" />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-sentinel-border bg-sentinel-panel/40 px-6 py-3">
          <div className="text-sm text-sentinel-muted">
            Signed in as{" "}
            <span className="text-slate-100">
              {user.displayName ?? user.email ?? user.uid}
            </span>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-slate-300 hover:bg-sentinel-bg hover:text-white"
    >
      {label}
    </Link>
  );
}
