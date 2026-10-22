// Response headers applied to every route by next.config.mjs. Plain .mjs so
// next.config.mjs can import it without a TypeScript build step.
//
// These are compiled into the build, so they must not depend on the ring: one
// image is promoted int → test → acc → prod. Ring-specific behaviour (robots,
// indexing) is decided at request time — see src/app/robots.ts.

export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
