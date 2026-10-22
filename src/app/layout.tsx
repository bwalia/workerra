import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/shared/ui";
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
          <Container className="flex h-14 items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-brand-700">
              Workerra
            </Link>
            <nav aria-label="Main" className="flex gap-4 text-sm text-slate-600">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-slate-900">
                  {n.label}
                </Link>
              ))}
            </nav>
          </Container>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500">
          <Container>© {new Date().getFullYear()} Workerra · workerra.uk</Container>
        </footer>
      </body>
    </html>
  );
}
