"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { isSafeActionHref } from "../journeys";
import { MAX_HISTORY_MESSAGES, MAX_PROMPT_LENGTH, SUGGESTED_PROMPTS } from "../prompts";
import { ASK_TOPICS } from "../topics";
import type { AssistantMode, ChatAction, ChatMessage, ChatReply, ChatRequest } from "../types";

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

function newMessage(role: ChatMessage["role"], content: string, extras?: Pick<ChatMessage, "actions" | "suggestions">): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString(), ...extras };
}

async function requestReply(body: ChatRequest, signal: AbortSignal): Promise<ChatReply> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json().catch(() => null)) as { data?: ChatReply; error?: { message?: string } } | null;
  if (!res.ok || !json?.data?.reply) throw new Error(json?.error?.message || NETWORK_ERROR);
  return json.data;
}

const CHIP =
  "rounded-full border border-line bg-surface px-3 py-1 text-sm text-body hover:border-brand-500 hover:text-accent";

/**
 * Links under an answer. Internal pages use client navigation; mailto: is a plain link.
 * Messages are restored from sessionStorage, so hrefs are re-checked before rendering.
 */
function ActionLinks({ actions }: { actions: ChatAction[] }) {
  const style = "rounded-lg border border-brand-500 px-3 py-1 text-sm font-medium text-accent hover:bg-accent-soft";
  const safe = actions.filter((a) => typeof a?.href === "string" && isSafeActionHref(a.href));
  if (safe.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {safe.map((a) => (
        <li key={a.href}>
          {a.href.startsWith("/") ? (
            <Link href={a.href} className={style}>
              {a.label}
            </Link>
          ) : (
            <a href={a.href} className={style}>
              {a.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ChatPanel({ initialQuestion, mode }: { initialQuestion?: string; mode: AssistantMode }) {
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
      const { reply, actions, suggestions } = await requestReply({ message: pending.content, history }, ctrl.signal);
      setMessages((current) => {
        const next = [...current, newMessage("assistant", reply, { actions, suggestions })];
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
    if (initialQuestion) {
      send(initialQuestion, stored);
      router.replace("/chat", { scroll: false });
    }
  }, [initialQuestion, send, router]);

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
  const last = messages.at(-1);
  const quickReplies = !busy && !error && last?.role === "assistant" ? (last.suggestions ?? []) : [];

  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm text-muted">Find a job, hire, build your profile, apply, or contact the team.</p>
        {messages.length > 0 && (
          <button type="button" onClick={reset} className="text-sm text-muted hover:text-accent">
            New conversation
          </button>
        )}
      </div>

      <div className="min-h-[18rem] space-y-3 px-4 py-5" aria-live="polite" aria-busy={busy}>
        {mode === "guide" && (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            AI answers are switched off right now, so the assistant will guide you to the right place instead.
          </p>
        )}

        {messages.length === 0 && !busy && (
          <div>
            <p className="text-muted">Hi, I&apos;m the Workerra assistant. How can I help?</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((s) => (
                <li key={s.label}>
                  <button type="button" onClick={() => send(s.prompt, messages)} className={CHIP}>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">Or try asking:</p>
            <ul className="mt-2 space-y-1.5">
              {ASK_TOPICS.map(({ examples: [example] }) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => send(example, messages)}
                    className="text-left text-sm text-accent hover:underline"
                  >
                    &ldquo;{example}&rdquo;
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
            <div key={m.id} className="max-w-[85%]">
              <p className="w-fit whitespace-pre-wrap rounded-xl border border-line bg-subtle px-4 py-2 text-ink">
                {m.content}
              </p>
              {m.actions && m.actions.length > 0 && <ActionLinks actions={m.actions} />}
            </div>
          ),
        )}

        {quickReplies.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Suggested replies">
            {quickReplies.map((text) => (
              <li key={text}>
                <button type="button" onClick={() => send(text, messages)} className={CHIP}>
                  {text}
                </button>
              </li>
            ))}
          </ul>
        )}

        {busy && (
          <p role="status" className="flex w-fit items-center gap-2 rounded-xl border border-line bg-subtle px-4 py-2 text-muted">
            <span className="flex gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
            </span>
            Workerra is thinking…
          </p>
        )}

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <span>{error.text}</span>
            <button type="button" onClick={retry} className="font-medium underline hover:no-underline">
              Try again
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-line p-3">
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
            placeholder="Ask about jobs, hiring, your profile or applications…"
            className="max-h-48 flex-1 resize-y rounded-lg bg-transparent px-3 py-2 text-ink outline-none placeholder:text-faint disabled:bg-subtle"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex justify-between gap-4 px-1 text-xs text-faint">
          <span>AI answers can be wrong. Don&apos;t share passwords, bank details or ID documents.</span>
          {remaining < 200 && <span className={remaining < 50 ? "text-amber-600 dark:text-amber-400" : undefined}>{remaining} left</span>}
        </div>
      </form>
    </div>
  );
}
