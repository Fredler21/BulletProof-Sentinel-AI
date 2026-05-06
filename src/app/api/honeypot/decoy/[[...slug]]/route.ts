import { type NextRequest } from "next/server";
import { respondAsDecoy } from "@/lib/server/honeypotResponses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest, context: { params: Promise<{ slug?: string[] }> }): Promise<Response> {
  const { slug } = await context.params;
  const path = "/" + (slug ?? []).join("/");
  return respondAsDecoy(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const HEAD = handle;
export const OPTIONS = handle;
