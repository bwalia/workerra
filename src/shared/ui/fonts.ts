import localFont from "next/font/local";

// Site typefaces, self-hosted from the Fontsource packages (OFL-1.1) so builds
// never reach out to Google Fonts. next/font serves them from /_next/static
// with size-adjusted fallbacks, so swapping in the web font doesn't shift layout.
//
// Inter is the text face: built for screens, clear at small sizes, with
// tabular figures for pay and dates. Plus Jakarta Sans gives headings and the
// wordmark a warmer, more distinctive voice. Latin covers UK English and £.

export const fontSans = localFont({
  src: "../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-sans",
});

export const fontDisplay = localFont({
  src: "../../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-display",
});
