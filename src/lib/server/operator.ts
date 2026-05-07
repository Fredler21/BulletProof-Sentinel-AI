import { getSessionUser } from "@/lib/server/session";

/**
 * Returns true if the current request comes from an authenticated Sentinel
 * dashboard user (operator). Honeypot handlers use this to skip recording
 * trap events when an operator is just browsing/testing the decoys, so
 * legitimate staff aren't counted in the suspect-IP rollups.
 */
export async function isSentinelOperator(): Promise<boolean> {
  try {
    const user = await getSessionUser();
    return user != null;
  } catch {
    return false;
  }
}
