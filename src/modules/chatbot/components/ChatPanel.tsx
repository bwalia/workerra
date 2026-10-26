"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_HISTORY_MESSAGES, MAX_PROMPT_LENGTH, SUGGESTED_PROMPTS } from "../prompts";
import type { ChatMessage, ChatReply, ChatRequest } from "../types";

// The conversation on /chat. History lives in sessionStorage (as in the JobShout
// dock) and the last few messages go to POST /api/chat with each turn.

const STORAGE_KEY = "workerra.chat.v1";
const NETWORK_ERROR = "Couldn't reach Workerra. Check your connection and try again.";

function loadMessages(): ChatMessage[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* private mode or quota: the conversation just won't survive a reload */
  }
}

function newMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

async function requestReply(body: ChatRequest, signal: AbortSignal): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json().catch(() => null)) as { data?: ChatReply; error?: { message?: string } } | null;
  if (!res.ok || !json?.data?.reply) throw new Error(json?.error?.message || NETWORK_ERROR);
  return json.data.reply;
}

export function ChatPanel({ initialQuestion, enabled }: { initialQuestion?: string; enabled: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; retry: ChatMessage } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Ask the assistant to answer `pending`, given the conversation before it.
  const answer = useCallback(async (before: ChatMessage[], pending: ChatMessage) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    try {
      const history = before.slice(-MAX_HISTORY_MESSAGES).map(({ role, content }) => ({ role, content }));
      const reply = await requestReply({ message: pending.content, history }, ctrl.signal);
      setMessages((current) => {
        const next = [...current, newMessage("assistant", reply)];
        saveMessages(next);
        return next;
      });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError({ text: err instanceof Error ? err.message : NETWORK_ERROR, retry: pending });
    } finally {
      if (abortRef.current === ctrl) setBusy(false);
    }
  }, []);

  const send = useCallback(
    (text: string, before: ChatMessage[]) => {
      const content = text.trim().slice(0, MAX_PROMPT_LENGTH);
      if (!content) return;
      const pending = newMessage("user", content);
      const next = [...before, pending];
      setMessages(next);
      saveMessages(next);
      void answer(before, pending);
    },
    [answer],
  );

  // Restore the session's conversation, then send the question carried over from the home page once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const stored = loadMessages();
    setMessages(stored);
    if (initialQuestion && enabled) {
      send(initialQuestion, stored);
      router.replace("/chat", { scroll: false });
    }
  }, [initialQuestion, enabled, send, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, busy, error]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !draft.trim()) return;
    send(draft, messages);
    setDraft("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) onSubmit(e);
  };
  const retry = () => {
    if (!error || busy) return;
    const index = messages.findIndex((m) => m.id === error.retry.id);
    void answer(index >= 0 ? messages.slice(0, index) : messages, error.retry);
  };
  const reset = () => {
    abortRef.current?.abort();
    setBusy(false);
    setError(null);
    setMessages([]);
    saveMessages([]);
  };

  const remaining = MAX_PROMPT_LENGTH - draft.length;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="text-sm text-slate-600">Jobs, CVs, job alerts and hiring — ask in plain English.</p>
        {messages.length > 0 && (
          <button type="button" onClick={reset} className="text-sm text-slate-500 hover:text-brand-700">
            New conversation
          </button>
        )}
      </div>

      <div className="min-h-[18rem] space-y-3 px-4 py-5" aria-live="polite" aria-busy={busy}>
        {!enabled && (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            The assistant is offline right now. Please try again later.
          </p>
        )}

        {enabled && messages.length === 0 && !busy && (
          <div>
            <p className="text-slate-600">Hi, I&apos;m the Workerra assistant. How can I help?</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => send(s.prompt, messages)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:border-brand-500 hover:text-brand-700"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <p key={m.id} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-xl bg-brand-600 px-4 py-2 text-white">
              {m.content}
            </p>
          ) : (
            <p
              key={m.id}
              className="w-fit max-w-[85%] whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-800"
            >
              {m.content}
            </p>
          ),
        )}

        {busy && (
          <p role="status" className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-500">
            <span className="flex gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </span>
            Workerra is thinking…
          </p>
        )}

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{error.text}</span>
            <button type="button" onClick={retry} className="font-medium underline hover:no-underline">
              Try again
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="chat-composer" className="sr-only">
            Message the Workerra assistant
          </label>
          <textarea
            id="chat-composer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_PROMPT_LENGTH}
            rows={2}
            disabled={!enabled}
            placeholder={enabled ? "Ask about jobs, your CV, or hiring…" : "The assistant is offline"}
            className="max-h-48 flex-1 resize-y rounded-lg px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={!enabled || busy || !draft.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex justify-between gap-4 px-1 text-xs text-slate-400">
          <span>AI answers can be wrong. Don&apos;t share passwords, bank details or ID documents.</span>
          {remaining < 200 && <span className={remaining < 50 ? "text-amber-600" : undefined}>{remaining} left</span>}
        </div>
      </form>
    </div>
  );
}
