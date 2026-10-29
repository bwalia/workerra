import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader, THEME_SCRIPT } from "@/shared/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Workerra — find work, hire faster", template: "%s · Workerra" },
  description: "Workerra is an AI-first jobs and recruitment platform. Ask the assistant to find jobs, improve your CV or hire.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script sets .dark on <html> before React hydrates, hence suppressHydrationWarning.
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
