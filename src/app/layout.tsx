import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Container, Logo } from "@/shared/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Workerra — find work, hire faster", template: "%s · Workerra" },
  description: "Workerra is an AI-first jobs and recruitment platform. Ask the assistant to find jobs, improve your CV or hire.",
};

const NAV = [
  { href: "/jobs", label: "Jobs" },
  { href: "/candidates", label: "Candidates" },
  { href: "/recruiters", label: "Recruiters" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-slate-200 bg-white">
          <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
            <Link href="/" aria-label="Workerra home" className="flex">
              <Logo />
            </Link>
            <nav aria-label="Main" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-slate-900">
                  {n.label}
                </Link>
              ))}
            </nav>
          </Container>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-10 text-sm text-slate-500">
          <Container className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <Link href="/" aria-label="Workerra home" className="flex">
                <Logo markClassName="h-7 w-7" />
              </Link>
              <p className="mt-3">Two sides, one match. The assistant that brings people and work together.</p>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-slate-900">
                  {n.label}
                </Link>
              ))}
            </nav>
          </Container>
          <Container className="mt-8">
            <p className="border-t border-slate-100 pt-6">© {new Date().getFullYear()} Workerra · workerra.uk</p>
          </Container>
        </footer>
      </body>
    </html>
  );
}
