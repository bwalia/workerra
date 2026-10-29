"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Container } from "./Container";

// Job search in the site header. A plain GET form to /jobs (like the form on
// that page), so it works without client JavaScript and the results page is a
// shareable URL. Searching from here starts fresh: only the keywords are kept.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
const INPUT =
  "w-full rounded-full border border-line-strong bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

/** The current /jobs keywords, so the header shows what's being searched. */
function useCurrentQuery(): string {
  const pathname = usePathname();
  const params = useSearchParams();
  return pathname === "/jobs" ? (params.get("q") ?? "") : "";
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function SearchForm({ id, query, autoFocus = false }: { id: string; query: string; autoFocus?: boolean }) {
  return (
    <form action="/jobs" method="get" role="search" aria-label="Search jobs" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search jobs
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-faint">
        <SearchIcon />
      </span>
      {/* key: show the new query after navigating between /jobs searches. */}
      <input
        key={query}
        id={id}
        name="q"
        type="search"
        defaultValue={query}
        maxLength={200}
        autoFocus={autoFocus}
        placeholder="Search jobs, e.g. nurse"
        className={INPUT}
      />
    </form>
  );
}

function Inline() {
  return <SearchForm id="nav-search" query={useCurrentQuery()} />;
}

/** The header's search field (wide screens). */
export function NavSearch() {
  return (
    <div className="hidden w-56 lg:block xl:w-64">
      <Suspense fallback={<SearchForm id="nav-search" query="" />}>
        <Inline />
      </Suspense>
    </div>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const query = useCurrentQuery();
  return (
    <div id="nav-search-panel" className="border-t border-line bg-surface lg:hidden">
      <Container className="flex items-center gap-2 py-3">
        <SearchForm id="nav-search-mobile" query={query} autoFocus />
        <button type="button" onClick={onClose} className={`shrink-0 rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink ${FOCUS}`}>
          Cancel
        </button>
      </Container>
    </div>
  );
}

/** Narrow screens: a button in the header that opens a search row beneath it. */
export function useNavSearchToggle() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const button = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-controls="nav-search-panel"
      aria-label={open ? "Close job search" : "Search jobs"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-subtle hover:text-ink lg:hidden ${FOCUS}`}
    >
      <SearchIcon className="h-5 w-5" />
    </button>
  );
  const panel = open ? (
    <Suspense fallback={null}>
      <Panel onClose={() => setOpen(false)} />
    </Suspense>
  ) : null;
  return { open, setOpen, button, panel };
}
