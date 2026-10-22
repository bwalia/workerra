import type { ReactNode } from "react";
import type { ModuleDescriptor } from "@/shared/modules";
import { Container } from "./Container";

// Stand-in page for a module that has its route reserved but no features yet.
export function ModulePlaceholder({ module, children }: { module: ModuleDescriptor; children?: ReactNode }) {
  return (
    <Container className="py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600">Planned · phase {module.phase}</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">{module.name}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">{module.summary}</p>
      {children}
      <h2 className="mt-10 text-sm font-semibold text-slate-900">Coming in this module</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {module.planned.map((item) => (
          <li key={item} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </Container>
  );
}
