import { requireRole, listAllRoles, ROLE_LABEL } from "@/lib/server/roles";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { RoleSelect } from "@/app/dashboard/roles/_components/RoleSelect";

export const dynamic = "force-dynamic";

export default async function RolesPage(): Promise<React.ReactElement> {
  const me = await requireRole("super-admin");
  const roles = await listAllRoles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">User Roles</h1>
        <p className="text-sm text-sentinel-muted">
          Role-based access control. Only Super Admins can change roles. You are{" "}
          <span className="text-slate-100">{ROLE_LABEL[me.role]}</span>.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-sentinel-border bg-sentinel-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-sentinel-bg/40 text-xs uppercase tracking-wide text-sentinel-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">UID</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sentinel-border/60">
            {roles.map((r) => (
              <tr key={r.uid}>
                <td className="px-4 py-2 text-slate-100">
                  {r.email ?? <span className="text-sentinel-muted">—</span>}
                </td>
                <td className="px-4 py-2 font-mono text-[11px] text-sentinel-muted">
                  {r.uid}
                </td>
                <td className="px-4 py-2">
                  <RoleSelect uid={r.uid} role={r.role} disabled={r.uid === me.uid} />
                </td>
                <td className="px-4 py-2 text-xs text-sentinel-muted">
                  <TimeAgo timestamp={r.updatedAt} />
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-sentinel-muted"
                >
                  No users have signed in yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
