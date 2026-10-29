"use client";

import type { ReactNode } from "react";
import { setTheme, useTheme, type ThemeChoice } from "./theme";

const ICON = "h-[18px] w-[18px]";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
const MoonIcon = () => (
  <Icon>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Icon>
);
const SystemIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
);

/** Header button: flips between light and dark. */
export function ThemeToggle() {
  const theme = useTheme();
  const next = theme?.resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next} mode` : "Switch colour theme"}
      title={theme ? `Switch to ${next} mode` : undefined}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-subtle hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      {/* Both icons render on the server; CSS shows the right one before hydration. */}
      <span className="dark:hidden">
        <MoonIcon />
      </span>
      <span className="hidden dark:inline">
        <SunIcon />
      </span>
    </button>
  );
}

const CHOICES: { value: ThemeChoice; label: string; Icon: () => ReactNode }[] = [
  { value: "system", label: "System", Icon: SystemIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

/** Footer switch: system, light or dark. */
export function ThemeSwitch() {
  const theme = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex rounded-full border border-line bg-canvas p-1">
      {CHOICES.map((c) => {
        const active = theme?.choice === c.value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.label}
            title={c.label}
            onClick={() => setTheme(c.value)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 ${
              active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            <c.Icon />
          </button>
        );
      })}
    </div>
  );
}
