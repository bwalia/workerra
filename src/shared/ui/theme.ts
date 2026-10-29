"use client";

import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

// Light/dark theme. No stored choice means "follow the system setting". The
// choice lives in localStorage and is applied as .dark on <html>, before first
// paint by THEME_SCRIPT (theme-script.ts, inlined in the root layout) and
// afterwards by setTheme.

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const CHANGE_EVENT = "workerra:theme";

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice !== "system") return choice;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function apply(choice: ThemeChoice) {
  document.documentElement.classList.toggle("dark", resolve(choice) === "dark");
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* private mode: the theme still changes, it just isn't remembered */
  }
  apply(choice);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  const onSystem = () => {
    if (readChoice() === "system") apply("system");
    onChange();
  };
  // Another tab changed the theme.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    apply(readChoice());
    onChange();
  };
  media.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const snapshot = () => {
  const choice = readChoice();
  return `${choice}:${resolve(choice)}`;
};

/** The visitor's theme choice and what it resolves to, or null while server rendering. */
export function useTheme(): { choice: ThemeChoice; resolved: ResolvedTheme } | null {
  const value = useSyncExternalStore(subscribe, snapshot, () => null);
  if (!value) return null;
  const [choice, resolved] = value.split(":") as [ThemeChoice, ResolvedTheme];
  return { choice, resolved };
}
