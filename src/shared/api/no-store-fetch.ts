// Next.js caches server-side GET fetches in its data cache unless told not to,
// even on force-dynamic pages when the input is a Request (as @opsapi/client's
// openapi-fetch sends). Listings, applications and recruiter data must always be
// current, so every OpsAPI client uses this.
export const noStoreFetch: typeof globalThis.fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
