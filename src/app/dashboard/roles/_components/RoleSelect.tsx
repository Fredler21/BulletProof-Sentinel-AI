"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = [
  "viewer",
  "it-admin",
  "security-analyst",
  "super-admin",
];

export function RoleSelect({
  uid,
  role,
  disabled,
}: {
  uid: string;
  role: UserRole;
  disabled?: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState<UserRole>(role);

  return (
    <select
      value={value}
      disabled={disabled || busy}
      onChange={async (e) => {
        const next = e.target.value as UserRole;
        setValue(next);
        setBusy(true);
        try {
          await fetch(`/api/roles/${uid}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ role: next }),
          });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-md border border-sentinel-border bg-sentinel-bg px-2 py-1 text-xs text-slate-100 disabled:opacity-60"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
