import type { Metadata } from "next";
import { ChatPanel, MAX_PROMPT_LENGTH, chatbotModule } from "@/modules/chatbot";
import { assistantEnabled } from "@/modules/chatbot/server";
import { Container } from "@/shared/ui";

export const metadata: Metadata = { title: "Assistant" };
// Availability depends on runtime env (one image per ring), so never prerender.
export const dynamic = "force-dynamic";

export default function ChatPage({ searchParams }: { searchParams: { q?: string | string[] } }) {
  const raw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const question = raw?.trim().slice(0, MAX_PROMPT_LENGTH) || undefined;

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold text-slate-900">{chatbotModule.name}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Find suitable jobs, improve your CV and applications, set up job alerts, or get help hiring.
      </p>
      <div className="mt-8 max-w-3xl">
        <ChatPanel initialQuestion={question} enabled={assistantEnabled()} />
      </div>
    </Container>
  );
}
