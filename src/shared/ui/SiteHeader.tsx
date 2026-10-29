"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { MAIN_NAV, isActivePath } from "./site-nav";
import { ThemeToggle } from "./ThemeControls";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Workerra home" className={`flex rounded-lg ${FOCUS}`}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {MAIN_NAV.map((n) => {
              const active = isActivePath(pathname, n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS} ${
                      active ? "bg-accent-soft text-accent" : "text-muted hover:bg-subtle hover:text-ink"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/chat"
            className={`hidden rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:inline-flex ${FOCUS}`}
          >
            Ask the assistant
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-subtle hover:text-ink md:hidden ${FOCUS}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </Container>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-surface md:hidden">
          <Container className="py-3">
            <ul className="grid gap-1">
              {MAIN_NAV.map((n) => {
                const active = isActivePath(pathname, n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2.5 text-base font-medium ${FOCUS} ${
                        active ? "bg-accent-soft text-accent" : "text-body hover:bg-subtle"
                      }`}
                    >
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/chat"
              className={`mt-3 block rounded-lg bg-brand-600 px-4 py-2.5 text-center font-medium text-white hover:bg-brand-700 sm:hidden ${FOCUS}`}
            >
              Ask the assistant
            </Link>
          </Container>
        </nav>
      )}
    </header>
  );
}
