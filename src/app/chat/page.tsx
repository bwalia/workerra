import type { Metadata } from "next";
import { MAX_PROMPT_LENGTH, chatbotModule } from "@/modules/chatbot";
import { ModulePlaceholder } from "@/shared/ui";

export const metadata: Metadata = { title: "Assistant" };

export default function ChatPage({ searchParams }: { searchParams: { q?: string | string[] } }) {
  const raw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const question = raw?.trim().slice(0, MAX_PROMPT_LENGTH);

  return (
    <ModulePlaceholder module={chatbotModule}>
      {question && (
        <div className="mt-8 max-w-2xl space-y-3" aria-live="polite">
          <p className="ml-auto w-fit rounded-xl bg-brand-600 px-4 py-2 text-white">{question}</p>
          <p className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-600">
            The assistant isn&apos;t connected yet. It will answer here once the JobShout chat integration lands.
          </p>
        </div>
      )}
    </ModulePlaceholder>
  );
}
