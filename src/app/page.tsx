import Link from "next/link";
import { MODULES } from "@/modules/catalogue";
import { ChatEntry } from "@/modules/chatbot";
import { Container } from "@/shared/ui";

export default function HomePage() {
  const browsable = MODULES.filter((m) => m.basePath && m.id !== "chatbot");

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50 py-20">
        <Container className="flex flex-col items-center text-center">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Find work or hire — just ask.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Workerra&apos;s AI assistant finds matching jobs, helps with your CV and applications, and gives recruiters
            shortlists.
          </p>
          <div className="mt-8 flex w-full justify-center">
            <ChatEntry />
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <h2 className="text-xl font-semibold">Explore Workerra</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browsable.map((m) => (
              <li key={m.id}>
                <Link
                  href={m.basePath!}
                  className="block h-full rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-500"
                >
                  <span className="font-medium text-slate-900">{m.name}</span>
                  <p className="mt-1 text-sm text-slate-600">{m.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
