import type { ReactNode } from "react";
import type { ModuleDescriptor } from "@/shared/modules";
import { Container } from "./Container";
import { Photo } from "./Photo";
import type { PhotoId } from "./photos";

// Stand-in page for a module that has its route reserved but no features yet.
export function ModulePlaceholder({
  module,
  photo,
  children,
}: {
  module: ModuleDescriptor;
  photo?: PhotoId;
  children?: ReactNode;
}) {
  return (
    <Container className="py-16">
      <div className={photo ? "grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" : ""}>
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-accent">Planned · phase {module.phase}</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{module.name}</h1>
          <p className="mt-3 max-w-2xl text-muted">{module.summary}</p>
        </div>
        {photo && (
          <Photo
            id={photo}
            priority
            sizes="(min-width: 1024px) 26rem, (min-width: 768px) 22rem, 100vw"
            className="aspect-[3/2] w-full rounded-2xl shadow-lg ring-1 ring-line"
          />
        )}
      </div>
      {children}
      <h2 className="mt-10 text-sm font-semibold text-ink">Coming in this module</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {module.planned.map((item) => (
          <li key={item} className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-body">
            {item}
          </li>
        ))}
      </ul>
    </Container>
  );
}
