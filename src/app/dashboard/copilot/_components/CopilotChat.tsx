"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/lib/types";

const STARTERS: string[] = [
  "Summarize the highest-priority threats in my dashboard.",
  "What MITRE techniques map to honeypot triggers?",
  "Draft a hardening checklist for my Next.js + Firebase app.",
  "How should I respond to repeated failed login attempts?",
];

export function CopilotChat(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error ?? "Request failed");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "" },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col rounded-xl border border-sentinel-border bg-sentinel-panel">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-sentinel-muted">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-sentinel-border bg-sentinel-bg px-3 py-1.5 text-xs text-slate-200 hover:border-sentinel-accent hover:text-sentinel-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-sentinel-accent px-4 py-2 text-sm text-slate-900"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm border border-sentinel-border bg-sentinel-bg px-4 py-3 text-sm leading-relaxed text-slate-100"
              }
            >
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-sentinel-border bg-sentinel-bg px-4 py-2 text-xs text-sentinel-muted">
              Sentinel is thinking…
            </div>
          </div>
        )}
        {error && (
          <p className="rounded-md border border-sentinel-danger/40 bg-sentinel-danger/10 px-3 py-2 text-xs text-sentinel-danger">
            {error}
          </p>
        )}
      </div>
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-sentinel-border p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Sentinel about a threat, finding, or response plan…"
          className="flex-1 rounded-md border border-sentinel-border bg-sentinel-bg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sentinel-accent"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-sentinel-accent px-4 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-300 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
