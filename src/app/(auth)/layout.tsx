// Force the auth route group out of static prerender so the Firebase client
// module is never evaluated at build-time (would crash without env vars).
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
