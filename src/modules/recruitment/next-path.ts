/** Where to go after signing in: only pages under /recruiters, never another site. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/recruiters(\/[\w\-/?=&%.]*)?$/.test(next) && !next.includes("//")
    ? next
    : "/recruiters";
}
