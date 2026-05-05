import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/server/ai";
import { requireSessionUser } from "@/lib/server/session";
import type { ChatMessage } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_MESSAGES = 30;
const MAX_LEN = 4000;

function sanitize(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (
      typeof m !== "object" ||
      m === null ||
      typeof (m as { role: unknown }).role !== "string" ||
      typeof (m as { content: unknown }).content !== "string"
    ) {
      continue;
    }
    const r = (m as { role: string }).role;
    const role: ChatMessage["role"] =
      r === "user" || r === "assistant" || r === "system" ? r : "user";
    out.push({ role, content: (m as { content: string }).content.slice(0, MAX_LEN) });
  }
  return out.slice(-MAX_MESSAGES);
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    messages?: unknown;
  };
  const messages = sanitize(body.messages);
  if (messages.length === 0) {
    return NextResponse.json({ error: "no_messages" }, { status: 400 });
  }
  try {
    const reply = await chat(messages);
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "chat_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
