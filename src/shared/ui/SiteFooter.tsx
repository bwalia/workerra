import Link from "next/link";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { FOOTER_NAV } from "./site-nav";
import { ThemeSwitch } from "./ThemeControls";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface text-sm">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <Link href="/" aria-label="Workerra home" className="inline-flex rounded-lg">
            <Logo markClassName="h-7 w-7" />
          </Link>
          <p className="mt-3 max-w-xs text-muted">Two sides, one match. The assistant that brings people and work together.</p>
          <Link
            href="/chat"
            className="mt-5 inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
          >
            Ask the assistant <span aria-hidden>→</span>
          </Link>
        </div>

        {FOOTER_NAV.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="font-semibold text-ink">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((l) => (
                <li key={`${l.href}-${l.label}`}>
                  <Link href={l.href} className="text-muted transition hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col-reverse items-start gap-4 py-6 text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Workerra · workerra.uk</p>
          <ThemeSwitch />
        </Container>
      </div>
    </footer>
  );
}
