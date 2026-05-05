import { requireSessionUser } from "@/lib/server/session";
import { LiveCommandCenter } from "@/app/dashboard/live/_components/LiveCommandCenter";

export const dynamic = "force-dynamic";

export default async function LiveDashboardPage(): Promise<React.ReactElement> {
  await requireSessionUser();
  return <LiveCommandCenter />;
}
