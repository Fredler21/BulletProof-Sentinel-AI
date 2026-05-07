import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/server/session";
import { ensureRoleForUser, ROLE_LABEL } from "@/lib/server/roles";
import { LogoutButton } from "@/app/dashboard/_components/LogoutButton";
import { TopMarquee } from "@/app/dashboard/_components/TopMarquee";

const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; icon: string }[];
}[] = [
  {
    label: "Operations",
    items: [
      { href: "/dashboard", label: "Overview", icon: "◐" },
      { href: "/dashboard/events", label: "Events", icon: "≡" },
      { href: "/dashboard/incidents", label: "Incidents", icon: "▲" },
      { href: "/dashboard/alerts", label: "Alerts", icon: "✦" },
    ],
  },
  {
    label: "Defense",
    items: [
      { href: "/dashboard/scanner", label: "Scanner", icon: "◎" },
      { href: "/dashboard/honeypots", label: "Honeypots", icon: "✸" },
      { href: "/dashboard/projects", label: "Embed API", icon: "⌬" },
      { href: "/dashboard/blocklist", label: "Blocklist", icon: "⛔" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard/copilot", label: "AI Copilot", icon: "✺" },
      { href: "/dashboard/posture", label: "Posture", icon: "❖" },
      { href: "/dashboard/compliance", label: "Compliance", icon: "▣" },
      { href: "/dashboard/reports", label: "Reports", icon: "❑" },
    ],
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const role = await ensureRoleForUser(user);
  const isSuperAdmin = role.role === "super-admin";
  const initial = (user.displayName ?? user.email ?? "U")
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="holo-bg relative min-h-screen text-slate-200">
      <div className="hex-grid pointer-events-none absolute inset-0" />
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 p-3 md:block">
          <div className="glass sticky top-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl">
            <div className="hud-frame border-b border-white/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-cyan/80">
                ▎SENTINEL · v5.1
              </p>
              <p className="text-holo mt-1 font-mono text-base font-semibold tracking-wider">
                CYBER&nbsp;DEFENSE&nbsp;OS
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">
                AI-augmented SOC
              </p>
            </div>

            <Link
              href="/dashboard/live"
              className="holo-border glow-pulse mx-3 mt-3 flex items-center justify-between rounded-xl border border-neon-cyan/30 bg-black/40 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-neon-cyan hover:bg-neon-cyan/10"
            >
              <span className="flex items-center gap-2">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-neon-green/80" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green" />
                </span>
                ▌ Live Console
              </span>
              <span className="text-[10px] text-neon-cyan/60">↗</span>
            </Link>

            <nav className="flex-1 overflow-y-auto p-3 text-sm">
              {NAV_GROUPS.map((g) => (
                <div key={g.label} className="mb-4">
                  <p className="mb-1 px-2 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    {g.label}
                  </p>
                  {g.items.map((it) => (
                    <NavLink
                      key={it.href}
                      href={it.href}
                      label={it.label}
                      icon={it.icon}
                    />
                  ))}
                </div>
              ))}
              {isSuperAdmin && (
                <div className="mb-4">
                  <p className="mb-1 px-2 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    Admin
                  </p>
                  <NavLink href="/dashboard/roles" label="User Roles" icon="✦" />
                </div>
              )}
            </nav>

            <div className="m-3 rounded-xl border border-white/5 bg-black/40 p-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple font-mono text-sm font-bold text-black">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">
                    {user.displayName ?? user.email ?? user.uid}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-neon-cyan/80">
                    {ROLE_LABEL[role.role]}
                  </p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[9px] uppercase">
                <span className="rounded bg-neon-green/10 py-1 text-neon-green">
                  ONLINE
                </span>
                <span className="rounded bg-neon-cyan/10 py-1 text-neon-cyan">
                  SECURE
                </span>
                <span className="rounded bg-neon-pink/10 py-1 text-neon-pink">
                  ARMED
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopMarquee role={ROLE_LABEL[role.role]} />

          <header className="glass sticky top-0 z-30 mx-3 mt-3 flex items-center justify-between rounded-2xl px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="hidden font-mono text-[10px] uppercase tracking-[0.35em] text-slate-400 md:block">
                ▎THEATER · GLOBAL
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
                THREAT LEVEL ·{" "}
                <span className="text-neon-pink">ELEVATED</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="font-mono text-[11px] text-slate-300">
                  {user.displayName ?? user.email ?? user.uid}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan/80">
                  {ROLE_LABEL[role.role]}
                </p>
              </div>
              <LogoutButton />
            </div>
          </header>

          <main className="flex-1 px-3 py-4 md:px-4">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
    >
      <span className="w-5 text-center text-[11px] text-neon-cyan/70 group-hover:text-neon-cyan">
        {icon ?? "·"}
      </span>
      <span className="text-[13px]">{label}</span>
    </Link>
  );
}
