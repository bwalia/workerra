import "server-only";
import { createClient, OpsApiError, type OpsApiClient } from "@opsapi/client";
import { redirect } from "next/navigation";
import { noStoreFetch } from "@/shared/api";
import { authAvailable, clearSession, getSession, saveSession, tokenExpiry, type Session } from "@/shared/auth";
import { loadServerEnv } from "@/shared/config/env";
import { safeNext } from "./next-path";
import type { ApiApplication, ApiListing, RecruiterPaths } from "./opsapi-types";

export { safeNext };

// Server entry of the recruitment module. A recruiter is an OpsAPI user who is a
// member of Workerra's workspace (OPSAPI_NAMESPACE); everything they do goes to
// OpsAPI with their own token, so their workspace role decides what they may do.

export type { ApiApplication, ApiListing, AtsJobStatus } from "./opsapi-types";

/** Recruiter sign-in works on this ring (OpsAPI and SESSION_SECRET are set). */
export function recruiterSignInAvailable(): boolean {
  return authAvailable();
}

export function recruiterClient(session: Session): OpsApiClient<RecruiterPaths> {
  const { opsapi } = loadServerEnv();
  if (!opsapi) throw new Error("OpsAPI is not configured");
  return createClient<RecruiterPaths>({
    baseUrl: opsapi.url,
    token: session.opsapi.token,
    namespace: opsapi.namespace,
    timeoutMs: 8000,
    retries: 1,
    fetch: noStoreFetch,
  });
}

/**
 * The signed-in recruiter and an OpsAPI client acting as them. Sends people to
 * sign in when they aren't, and through /recruiters/session to renew an expired
 * token (cookies can only be written there, not while a page renders).
 */
export async function requireRecruiter(currentPath: string): Promise<{ session: Session; opsapi: OpsApiClient<RecruiterPaths> }> {
  if (!authAvailable()) redirect("/recruiters");
  const session = await getSession();
  if (!session) redirect(`/recruiters/sign-in?next=${encodeURIComponent(safeNext(currentPath))}`);
  if (session.opsapi.expiresAt - 30_000 < Date.now()) {
    redirect(`/recruiters/session?next=${encodeURIComponent(safeNext(currentPath))}`);
  }
  return { session, opsapi: recruiterClient(session) };
}

/** A token OpsAPI rejected mid-request (revoked, or the clock drifted): renew it, then come back. */
export function renewOnUnauthorized(err: unknown, currentPath: string): void {
  if (err instanceof OpsApiError && err.status === 401) {
    redirect(`/recruiters/session?next=${encodeURIComponent(safeNext(currentPath))}`);
  }
}

/**
 * GET /recruiters/session?next=…: swaps the refresh token for a new access token
 * and goes back to `next`, or to sign-in when the session can't be renewed.
 * Route handlers can write cookies; pages can't, so expired pages send people here.
 */
export async function handleSessionRenewal(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const signIn = () => redirect(`/recruiters/sign-in?next=${encodeURIComponent(next)}`);
  const { opsapi } = loadServerEnv();
  const session = await getSession();
  if (!opsapi || !session?.opsapi.refreshToken) {
    clearSession();
    signIn();
  }
  let renewed: { token: string; refreshToken?: string };
  try {
    renewed = await createClient({ baseUrl: opsapi!.url, timeoutMs: 8000 }).auth.refresh(session!.opsapi.refreshToken!);
  } catch (err) {
    if (!(err instanceof OpsApiError && (err.status === 401 || err.status === 403))) throw err;
    clearSession();
    return signIn();
  }
  saveSession({
    ...session!,
    opsapi: {
      token: renewed.token,
      refreshToken: renewed.refreshToken ?? session!.opsapi.refreshToken,
      expiresAt: tokenExpiry(renewed.token),
    },
  });
  redirect(next);
}

/** The workspace's listings, newest first (every ATS status). */
export async function listingsFor(opsapi: OpsApiClient<RecruiterPaths>, page = 1) {
  const { data } = await opsapi.GET("/api/v2/workerra/listings", { params: { query: { page, per_page: 50 } } });
  return { listings: data!.data, meta: data!.meta };
}

/** One of the workspace's listings and who applied for it, or null if it isn't the workspace's. */
export async function listingWithApplications(
  opsapi: OpsApiClient<RecruiterPaths>,
  jobId: string,
): Promise<{ listing: ApiListing; applications: ApiApplication[] } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) return null;
  const path = { path: { uuid: jobId } };
  try {
    const [listing, applications] = await Promise.all([
      opsapi.GET("/api/v2/workerra/listings/{uuid}", { params: path }),
      opsapi.GET("/api/v2/workerra/listings/{uuid}/applications", { params: path }),
    ]);
    return { listing: listing.data!.data, applications: applications.data!.data };
  } catch (err) {
    if (err instanceof OpsApiError && err.isNotFound) return null;
    throw err;
  }
}
