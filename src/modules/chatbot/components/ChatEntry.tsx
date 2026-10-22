"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MAX_PROMPT_LENGTH, SUGGESTED_PROMPTS, chatHref } from "../prompts";

// Home-page entry point to the assistant. It only routes to /chat with the
// first message; the conversation itself lives on the chat page.
export function ChatEntry() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const start = (text: string) => router.push(chatHref(text));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) start(prompt);
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={onSubmit} className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <label htmlFor="chat-entry" className="sr-only">
          Ask Workerra
        </label>
        <input
          id="chat-entry"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder="Ask about jobs, your CV, or hiring…"
          className="flex-1 rounded-lg px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!prompt.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => start(s.prompt)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:border-brand-500 hover:text-brand-700"
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
