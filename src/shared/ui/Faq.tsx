import type { ReactNode } from "react";

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

// Native <details> disclosures: keyboard and screen-reader friendly, and they
// work without client JavaScript.
export function Faq({ items, title = "Frequently asked questions", id }: { items: readonly FaqItem[]; title?: string; id?: string }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-2xl font-semibold text-ink">
        {title}
      </h2>
      <div className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
        {items.map((item) => (
          <details key={item.question} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden className="mt-0.5 shrink-0 text-muted transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="mt-3 max-w-3xl space-y-2 text-body">{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
