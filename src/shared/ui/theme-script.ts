// Shared by the pre-paint script (inlined in the root layout, a server
// component) and the client theme store in theme.ts. Kept out of theme.ts
// because a "use client" module's exports reach server components as references.

export const THEME_STORAGE_KEY = "workerra.theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Runs in <head> before the page paints, so a dark-mode visitor never sees a white flash. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
