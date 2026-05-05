"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export function LogoutButton(): React.ReactElement {
  const router = useRouter();
  async function onClick(): Promise<void> {
    await signOut(firebaseAuth);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-sentinel-border px-3 py-1.5 text-xs text-slate-200 hover:bg-sentinel-bg"
    >
      Sign out
    </button>
  );
}
