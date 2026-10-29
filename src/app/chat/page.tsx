import type { Metadata } from "next";
import { ChatFaq, ChatGuide, ChatPanel, MAX_PROMPT_LENGTH, chatbotModule } from "@/modules/chatbot";
import { assistantMode } from "@/modules/chatbot/server";
import { Container } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Assistant",
  description: "Ask the Workerra assistant about finding a job, changing career, writing a job brief or preparing an application.",
};
// Availability depends on runtime env (one image per ring), so never prerender.
export const dynamic = "force-dynamic";

export default function ChatPage({ searchParams }: { searchParams: { q?: string | string[] } }) {
  const raw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const question = raw?.trim().slice(0, MAX_PROMPT_LENGTH) || undefined;

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold text-ink">{chatbotModule.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Ask in plain English, the way you&rsquo;d ask a recruiter. The assistant helps you find jobs, think through career
        options, prepare a job brief if you&rsquo;re hiring, and get your CV and applications ready.
      </p>
      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ChatPanel initialQuestion={question} mode={assistantMode()} />
        <ChatGuide />
      </div>
      <div className="mt-16 max-w-3xl">
        <ChatFaq />
      </div>
    </Container>
  );
}
